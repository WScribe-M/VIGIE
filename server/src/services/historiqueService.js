import { config } from '../config/env.js';
import { User } from '../models/index.js';
import { minutesOuvreesEntre } from './slaService.js';

// Historique (timeline) d'un ticket (VIGIE-9) : une entrée par changement de statut, d'assignation,
// de priorité ou de domaine, avec auteur, date, ancienne et nouvelle valeur, et motif le cas échéant.
// Les entrées sont écrites par ticketService ($push) et ne sont jamais modifiées (schéma Ticket).

// Ordre chronologique, de la plus ancienne à la plus récente. Les entrées sont déjà ajoutées dans
// cet ordre ; on trie quand même, car deux écritures concurrentes ou le seed pourraient les
// intercaler. Le tri de JavaScript est stable : deux entrées de même date gardent leur ordre
// (prise en charge : statut, puis technicien).
export function trierHistorique(historique = []) {
  return [...historique].sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Historique renvoyé avec la fiche : trié, et les techniciens d'une assignation remplacés par leur
// nom (l'entrée ne stocke que l'identifiant). L'auteur est déjà « peuplé » par lireTicket.
// `modele` est injectable pour tester sans base de données.
export async function preparerHistorique(historique = [], modele = User) {
  const entrees = trierHistorique(historique);
  const ids = new Set();
  for (const entree of entrees) {
    if (entree.champ !== 'technicien') continue;
    if (entree.ancienneValeur) ids.add(String(entree.ancienneValeur));
    if (entree.nouvelleValeur) ids.add(String(entree.nouvelleValeur));
  }
  const personnes = ids.size
    ? await modele
        .find({ _id: { $in: [...ids] } })
        .select('nom prenom')
        .lean()
    : [];
  const parId = new Map(personnes.map((personne) => [String(personne._id), personne]));
  const personne = (valeur) => (valeur ? (parId.get(String(valeur)) ?? null) : null);

  return entrees.map((entree) =>
    entree.champ === 'technicien'
      ? {
          ...entree,
          ancienneValeur: personne(entree.ancienneValeur),
          nouvelleValeur: personne(entree.nouvelleValeur),
        }
      : entree,
  );
}

// Entrées « concerne » (VIGIE-15) vues par un CLIENT : il sait combien de personnes sont concernées
// (fiche 05, « 9 personnes concernées ») mais pas lesquelles, comme les suggestions de doublons
// ne montrent jamais le demandeur (cadrage 9.3). Sa propre entrée reste nominative.
export function masquerConcernes(historique, utilisateur) {
  if (utilisateur.role !== 'CLIENT') return historique;
  const estLui = (personne) => String(personne?._id ?? personne) === String(utilisateur.id);
  return historique.map((entree) =>
    entree.champ === 'concerne' && !estLui(entree.auteur)
      ? { ...entree, auteur: null, nouvelleValeur: null }
      : entree,
  );
}

// Ce que l'historique permet de calculer (critère de VIGIE-9), pour les stories qui l'utiliseront :
// SLA et suspension (VIGIE-20), délais du pilotage (VIGIE-24), requalifications (VIGIE-26),
// réouvertures (VIGIE-30). Pure : l'historique suffit, sans relire le ticket.
//   creation      : date de la première entrée (création, statut null → NOUVEAU)
//   priseEnCharge : premier passage NOUVEAU → EN_COURS (temps de prise en charge = priseEnCharge − creation)
//   resolution    : dernier passage à TERMINE, si le ticket l'est toujours (sinon null : réouvert ou pas
//                   encore résolu ; le temps de résolution ne compte que les tickets TERMINE, cadrage 9.10)
//   suspensions   : périodes passées en EN_ATTENTE_DEMANDEUR ; fin null si l'attente est en cours
//   requalifications, reouvertures : nombres d'entrées priorité et TERMINE → EN_COURS
export function indicateursHistorique(historique = []) {
  const statuts = trierHistorique(historique).filter((entree) => entree.champ === 'statut');

  const suspensions = [];
  let debutAttente = null;
  for (const entree of statuts) {
    const enAttente = entree.nouvelleValeur === 'EN_ATTENTE_DEMANDEUR';
    if (enAttente && !debutAttente) {
      debutAttente = entree.date;
    } else if (!enAttente && debutAttente) {
      suspensions.push({ debut: debutAttente, fin: entree.date });
      debutAttente = null;
    }
  }
  if (debutAttente) suspensions.push({ debut: debutAttente, fin: null });

  const derniere = statuts.at(-1);
  return {
    creation: statuts[0]?.date ?? null,
    priseEnCharge:
      statuts.find(
        (entree) => entree.ancienneValeur === 'NOUVEAU' && entree.nouvelleValeur === 'EN_COURS',
      )?.date ?? null,
    resolution: derniere?.nouvelleValeur === 'TERMINE' ? derniere.date : null,
    suspensions,
    requalifications: historique.filter((entree) => entree.champ === 'priorite').length,
    reouvertures: statuts.filter(
      (entree) => entree.ancienneValeur === 'TERMINE' && entree.nouvelleValeur === 'EN_COURS',
    ).length,
  };
}

// Durée de suspension du SLA, en minutes ouvrées comme le délai lui-même (cadrage 9.2) :
// une attente en cours est comptée jusqu'à « maintenant »
export function minutesSuspendues(suspensions, maintenant = new Date(), horaires = config.sla) {
  return suspensions.reduce(
    (total, { debut, fin }) => total + minutesOuvreesEntre(debut, fin ?? maintenant, horaires),
    0,
  );
}
