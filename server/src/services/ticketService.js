import mongoose from 'mongoose';
import { DOMAINES, IMPACTS, RANG_PRIORITE, URGENCES } from '../models/constantes.js';
import { Ticket } from '../models/index.js';
import { emettre, ROOM_PILOTAGE, ROOM_SUPPORT, roomTicket } from '../socket/index.js';
import { ErreurHttp } from '../utils/ErreurHttp.js';
import { formaterNumero, prochainNumeroTicket } from './numeroService.js';
import { calculerPriorite, verifierRequalification } from './prioriteService.js';
import { deduireDomaine } from './serviceService.js';
import { notifierNouveauTicket } from './notificationService.js';
import { calculerEcheance } from './slaService.js';
import { STATUTS_CLOS, transitionsDuMenu, verifierChangement } from './statutService.js';
import { filtreTicketsVisibles, peutVoirTicket } from './visibiliteService.js';

// Longueur maximale du titre : celle du compteur du formulaire (docs/ecrans/03-creer-un-ticket.md)
const TITRE_MAX = 120;
// Garde-fou contre un texte démesuré, pas une règle métier : une description reste courte
const REPONSE_MAX = 2000;

// Description guidée (cadrage 9.9) : trois questions, toujours dans le même ordre et avec les mêmes
// intitulés. Tous les tickets ont ainsi une description de même forme (recherche, futur RAG).
export const RUBRIQUES_DESCRIPTION = [
  { champ: 'probleme', intitule: 'Que se passe-t-il ?', obligatoire: true },
  { champ: 'depuis', intitule: 'Depuis quand ?', obligatoire: true },
  { champ: 'messageErreur', intitule: "Quel message d'erreur ?", obligatoire: false },
];

const CHAMPS_CREATION = ['titre', 'description', 'service', 'impact', 'urgence'];

// Lecture d'un ticket et liste : uniquement les champs affichés (CONTRIBUTING, Requêtes MongoDB).
// Ni commentaires, ni historique, ni pièces jointes : chaque story les ajoutera avec ses droits.
const CHAMPS_FICHE =
  'numero titre description service domaine impact urgence prioriteCalculee prioriteFinale statut dateStatut echeanceSla demandeur technicien createdAt updatedAt dateCloture datePriseEnCharge vuParSupportLe resolution';
// Rôles du support : ils font avancer les tickets (une seule équipe, cadrage 3.1)
const ROLES_SUPPORT = ['GESTIONNAIRE', 'ADMIN'];
const CHAMPS_LISTE = 'numero titre service statut prioriteFinale echeanceSla createdAt';
// Liste minimale de VIGIE-3, sans pagination : VIGIE-6 ajoutera tri, filtres et pagination
const LISTE_MAX = 50;

function texte(valeur, { libelle, max, obligatoire = true }) {
  if (valeur === undefined || valeur === null || valeur === '') {
    if (obligatoire) {
      throw new ErreurHttp(400, `${libelle} : champ obligatoire`);
    }
    return '';
  }
  if (typeof valeur !== 'string') {
    throw new ErreurHttp(400, `${libelle} : texte attendu`);
  }
  const propre = valeur.trim();
  if (obligatoire && !propre) {
    throw new ErreurHttp(400, `${libelle} : champ obligatoire`);
  }
  if (propre.length > max) {
    throw new ErreurHttp(400, `${libelle} : ${max} caractères au maximum`);
  }
  return propre;
}

// Assemble les trois réponses en un seul texte, avec les intitulés fixes.
// Une rubrique facultative laissée vide est écrite « Non précisé » : la forme reste la même.
export function composerDescription(reponses) {
  if (!reponses || typeof reponses !== 'object' || Array.isArray(reponses)) {
    throw new ErreurHttp(400, 'Description : réponses aux trois questions attendues');
  }
  return RUBRIQUES_DESCRIPTION.map(({ champ, intitule, obligatoire }) => {
    const reponse = texte(reponses[champ], { libelle: intitule, max: REPONSE_MAX, obligatoire });
    return `${intitule}\n${reponse || 'Non précisé'}`;
  }).join('\n\n');
}

// Vérifie le corps de POST /api/tickets. Un champ inconnu est refusé : le demandeur ne choisit
// ni la priorité, ni le délai, ni le statut, ni le demandeur (lu dans le jeton).
export function validerCreation(donnees) {
  if (!donnees || typeof donnees !== 'object' || Array.isArray(donnees)) {
    throw new ErreurHttp(400, 'Données invalides');
  }
  const inconnus = Object.keys(donnees).filter((champ) => !CHAMPS_CREATION.includes(champ));
  if (inconnus.length) {
    throw new ErreurHttp(400, `Champ non autorisé : ${inconnus.join(', ')}`);
  }
  if (!IMPACTS.includes(donnees.impact)) {
    throw new ErreurHttp(400, 'Impact invalide');
  }
  if (!URGENCES.includes(donnees.urgence)) {
    throw new ErreurHttp(400, 'Urgence invalide');
  }
  if (!mongoose.isObjectIdOrHexString(donnees.service)) {
    throw new ErreurHttp(400, 'Service invalide');
  }
  return {
    titre: texte(donnees.titre, { libelle: 'Titre', max: TITRE_MAX }),
    description: composerDescription(donnees.description),
    service: donnees.service,
    impact: donnees.impact,
    urgence: donnees.urgence,
  };
}

// Construit le document du nouveau ticket. Pure (numéro, domaine et date fournis) pour être
// testée sans base de données.
export function preparerTicket(champs, utilisateur, { numero, domaine, maintenant }) {
  const priorite = calculerPriorite(champs.impact, champs.urgence);
  return {
    ...champs,
    numero,
    domaine,
    prioriteCalculee: priorite,
    prioriteFinale: priorite,
    // rangPriorite est recalculé par le schéma à la validation
    statut: 'NOUVEAU',
    dateStatut: maintenant,
    echeanceSla: calculerEcheance(maintenant, priorite),
    demandeur: utilisateur.id,
    createur: utilisateur.id,
    canal: 'APPLICATION',
    // Première entrée de l'historique : la création, base du jalon « Reçu » (cadrage 9.8)
    historique: [
      { auteur: utilisateur.id, champ: 'statut', ancienneValeur: null, nouvelleValeur: 'NOUVEAU' },
    ],
  };
}

// Délai affiché à l'étape 2 du formulaire, avant la création : même calcul que preparerTicket,
// pour que le client n'ait pas à recopier la matrice ni le calcul en heures ouvrées
export function estimerTicket(impact, urgence, maintenant = new Date()) {
  if (!IMPACTS.includes(impact)) {
    throw new ErreurHttp(400, 'Impact invalide');
  }
  if (!URGENCES.includes(urgence)) {
    throw new ErreurHttp(400, 'Urgence invalide');
  }
  const prioriteCalculee = calculerPriorite(impact, urgence);
  return { prioriteCalculee, echeanceSla: calculerEcheance(maintenant, prioriteCalculee) };
}

// Ajoute la référence affichée (VIG-0042) pour que le client ne recopie pas le format
function avecReference(ticket) {
  return { ...ticket, reference: formaterNumero(ticket.numero) };
}

export async function creerTicket(donnees, utilisateur) {
  // Tout est vérifié avant de prendre un numéro : une requête invalide ne consomme pas de numéro
  const champs = validerCreation(donnees);
  let domaine;
  try {
    domaine = await deduireDomaine(champs.service);
  } catch (err) {
    // Le service vient du corps de la requête : inconnu, c'est une donnée invalide (400), pas une
    // adresse introuvable (404)
    throw err.status === 404 ? new ErreurHttp(400, 'Service inconnu') : err;
  }
  const numero = await prochainNumeroTicket();
  const ticket = await Ticket.create(
    preparerTicket(champs, utilisateur, { numero, domaine, maintenant: new Date() }),
  );
  // Le ticket est enregistré : une panne de notification ne doit pas faire échouer la création
  // (le demandeur recevrait une erreur pour un ticket bien créé). On la journalise.
  try {
    await notifierNouveauTicket(ticket._id, utilisateur.id);
  } catch (err) {
    console.error('Notification du nouveau ticket impossible :', err);
  }
  return lireTicket(ticket._id, utilisateur);
}

// Prévient ceux qui regardent le ticket, « Ma file » et le pilotage : ils rechargent par l'API.
// L'événement ne contient que l'identifiant et le statut, jamais de donnée réservée au support.
function signalerModification(
  ticket,
  rooms = [roomTicket(ticket._id), ROOM_SUPPORT, ROOM_PILOTAGE],
) {
  emettre(rooms, 'ticket:modifie', { _id: String(ticket._id), statut: ticket.statut });
}

// Jalon « Vu par le support » (cadrage 9.8) : première ouverture par un GESTIONNAIRE (ni LECTEUR
// ni ADMIN). Le filtre vuParSupportLe: null garantit qu'il n'est posé qu'une fois, même à deux.
async function marquerVuParSupport(ticket, utilisateur) {
  if (utilisateur.role !== 'GESTIONNAIRE' || ticket.vuParSupportLe) return;
  const maintenant = new Date();
  const resultat = await Ticket.updateOne(
    { _id: ticket._id, vuParSupportLe: null },
    { $set: { vuParSupportLe: maintenant } },
  );
  if (resultat.modifiedCount) {
    ticket.vuParSupportLe = maintenant;
    // Seul le demandeur est concerné (sa frise avance) : on n'alerte pas tout le support
    signalerModification(ticket, roomTicket(ticket._id));
  }
}

// Un ticket invisible pour cet utilisateur répond comme un ticket inexistant : on ne révèle pas
// quels numéros existent
export async function lireTicket(id, utilisateur) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new ErreurHttp(404, 'Ticket introuvable');
  }
  const ticket = await Ticket.findById(id)
    .select(`${CHAMPS_FICHE} suiveurs enCopie historique`)
    .populate('service', 'nom')
    .populate('demandeur', 'nom prenom')
    .populate('technicien', 'nom prenom')
    .populate('resolution.auteur', 'nom prenom')
    .lean();
  if (!ticket || !peutVoirTicket(utilisateur, ticket)) {
    throw new ErreurHttp(404, 'Ticket introuvable');
  }
  await marquerVuParSupport(ticket, utilisateur);

  // Motif du dernier abandon, affiché à la place de la frise (fiche 05). L'historique complet
  // sera renvoyé par VIGIE-9 ; ici on n'en garde que ce motif.
  if (ticket.statut === 'ABANDONNE') {
    const abandon = ticket.historique.findLast(
      (entree) => entree.champ === 'statut' && entree.nouvelleValeur === 'ABANDONNE',
    );
    ticket.motifAbandon = abandon?.motif ?? null;
  }
  // Statuts du menu « Changer le statut », calculés ici pour ne pas recopier la règle côté client
  if (ROLES_SUPPORT.includes(utilisateur.role)) {
    ticket.transitionsPossibles = transitionsDuMenu(ticket.statut);
  }

  // suiveurs, enCopie et historique ne servent qu'aux calculs ci-dessus : on ne les renvoie pas
  delete ticket.suiveurs;
  delete ticket.enCopie;
  delete ticket.historique;
  return avecReference(ticket);
}

// Écrit une transition seulement si le ticket est encore dans l'état lu (état attendu dans le
// filtre) : deux gestionnaires qui agissent en même temps ne s'écrasent pas, le second reçoit 409.
async function appliquerTransition(id, filtre, miseAJour) {
  const ticket = await Ticket.findOneAndUpdate({ _id: id, ...filtre }, miseAJour, {
    returnDocument: 'after',
  })
    .select('statut')
    .lean();
  if (!ticket) {
    const existe = await Ticket.exists({ _id: id });
    throw existe
      ? new ErreurHttp(409, 'Le ticket a été modifié entre-temps : rechargez-le')
      : new ErreurHttp(404, 'Ticket introuvable');
  }
  signalerModification(ticket);
}

function entreeHistorique(utilisateur, champ, ancienneValeur, nouvelleValeur, date, motif) {
  return { auteur: utilisateur.id, champ, ancienneValeur, nouvelleValeur, motif, date };
}

// Menu « Changer le statut » (GESTIONNAIRE, ADMIN) ; les règles sont dans statutService
export async function changerStatut(id, donnees, utilisateur) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new ErreurHttp(404, 'Ticket introuvable');
  }
  const actuel = await Ticket.findById(id).select('statut').lean();
  if (!actuel) {
    throw new ErreurHttp(404, 'Ticket introuvable');
  }
  const vers = donnees?.statut;
  const { motif, resolution } = verifierChangement(actuel.statut, vers, donnees ?? {});

  const maintenant = new Date();
  const $set = {
    statut: vers,
    dateStatut: maintenant,
    // Remplie à la clôture : le délai de contestation de 15 jours part de cette date
    dateCloture: STATUTS_CLOS.includes(vers) ? maintenant : null,
  };
  if (resolution) {
    $set.resolution = { ...resolution, auteur: utilisateur.id, date: maintenant };
  }
  await appliquerTransition(
    id,
    { statut: actuel.statut },
    {
      $set,
      $push: {
        historique: entreeHistorique(utilisateur, 'statut', actuel.statut, vers, maintenant, motif),
      },
    },
  );
  return lireTicket(id, utilisateur);
}

// « Prendre en charge » : le gestionnaire connecté devient le technicien et le ticket passe EN_COURS,
// en une seule écriture conditionnelle. Si un collègue l'a pris juste avant, rien n'est écrit : 409.
// VIGIE-8 complétera le message (« Déjà pris par … »), VIGIE-29 l'attribution à un autre technicien.
export async function prendreEnCharge(id, utilisateur) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new ErreurHttp(404, 'Ticket introuvable');
  }
  const maintenant = new Date();
  await appliquerTransition(
    id,
    { statut: 'NOUVEAU', technicien: null },
    {
      $set: {
        statut: 'EN_COURS',
        technicien: utilisateur.id,
        dateStatut: maintenant,
        datePriseEnCharge: maintenant,
      },
      $push: {
        historique: {
          $each: [
            entreeHistorique(utilisateur, 'statut', 'NOUVEAU', 'EN_COURS', maintenant),
            entreeHistorique(utilisateur, 'technicien', null, utilisateur.id, maintenant),
          ],
        },
      },
    },
  );
  return lireTicket(id, utilisateur);
}

// Tickets visibles, les plus récents d'abord : « Mes demandes » pour un CLIENT
export async function listerTickets(utilisateur) {
  const tickets = await Ticket.find(filtreTicketsVisibles(utilisateur))
    .select(CHAMPS_LISTE)
    .populate('service', 'nom')
    .sort({ createdAt: -1 })
    .limit(LISTE_MAX)
    .lean();
  return tickets.map(avecReference);
}

// Correction du domaine par le support (critère repris de VIGIE-4) : par exemple un ticket
// « Autre / je ne sais pas », arrivé en A_QUALIFIER, une fois qualifié. Tracée dans l'historique.
export async function corrigerDomaine(id, domaine, utilisateur) {
  if (!DOMAINES.includes(domaine)) {
    throw new ErreurHttp(400, 'Domaine technique invalide');
  }
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new ErreurHttp(404, 'Ticket introuvable');
  }
  const ticket = await Ticket.findById(id);
  if (!ticket) {
    throw new ErreurHttp(404, 'Ticket introuvable');
  }
  if (ticket.domaine === domaine) {
    throw new ErreurHttp(400, 'Le ticket a déjà ce domaine');
  }

  ticket.historique.push({
    auteur: utilisateur.id,
    champ: 'domaine',
    ancienneValeur: ticket.domaine,
    nouvelleValeur: domaine,
  });
  ticket.domaine = domaine;
  try {
    // optimisticConcurrency : refuse l'écriture si le ticket a changé depuis sa lecture
    await ticket.save();
  } catch (err) {
    if (err instanceof mongoose.Error.VersionError) {
      throw new ErreurHttp(409, 'Le ticket a été modifié entre-temps : rechargez-le');
    }
    throw err;
  }
  return lireTicket(ticket._id, utilisateur);
}

// Requalification de la priorité (VIGIE-5) : construit l'écriture à faire. Pure (ticket lu et date
// fournis) pour être testée sans base de données.
// - prioriteCalculee ne change pas : elle garde la trace de ce qu'avait déduit la matrice ;
// - rangPriorite est écrit avec prioriteFinale : findOneAndUpdate ne passe pas par le schéma ;
// - l'échéance repart de la requalification, avec le délai complet de la nouvelle priorité
//   (décision du 20/11/2026, cadrage 9.2) ; l'alerte SLA déjà envoyée ne vaut plus pour elle.
export function preparerRequalification(actuel, donnees, utilisateur, maintenant) {
  if (STATUTS_CLOS.includes(actuel.statut)) {
    throw new ErreurHttp(409, 'Ticket clos : la priorité ne peut plus être requalifiée');
  }
  const { priorite, motif } = verifierRequalification(actuel.prioriteFinale, donnees);
  return {
    // État attendu : si un collègue a requalifié ou clos le ticket entre-temps, rien n'est écrit (409)
    filtre: { prioriteFinale: actuel.prioriteFinale, statut: { $nin: STATUTS_CLOS } },
    miseAJour: {
      $set: {
        prioriteFinale: priorite,
        rangPriorite: RANG_PRIORITE[priorite],
        echeanceSla: calculerEcheance(maintenant, priorite),
        niveauAlerteSla: 'AUCUNE',
      },
      $push: {
        historique: entreeHistorique(
          utilisateur,
          'priorite',
          actuel.prioriteFinale,
          priorite,
          maintenant,
          motif,
        ),
      },
    },
  };
}

// « Requalifier la priorité » (GESTIONNAIRE, ADMIN) : le client ne peut jamais la modifier
export async function requalifierPriorite(id, donnees, utilisateur) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new ErreurHttp(404, 'Ticket introuvable');
  }
  const actuel = await Ticket.findById(id).select('statut prioriteFinale').lean();
  if (!actuel) {
    throw new ErreurHttp(404, 'Ticket introuvable');
  }
  const { filtre, miseAJour } = preparerRequalification(actuel, donnees, utilisateur, new Date());
  await appliquerTransition(id, filtre, miseAJour);
  return lireTicket(id, utilisateur);
}
