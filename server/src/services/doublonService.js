import mongoose from 'mongoose';
import { Ticket } from '../models/index.js';
import { emettre, ROOM_SUPPORT, roomTicket } from '../socket/index.js';
import { ErreurHttp } from '../utils/ErreurHttp.js';
import { formaterNumero } from './numeroService.js';
import { STATUTS_CLOS } from './statutService.js';
import { peutVoirTicket } from './visibiliteService.js';

// Doublons à la saisie (VIGIE-15, cadrage 9.3) : pendant qu'un client tape son titre, on lui
// propose les tickets ouverts qui ressemblent au sien ; « Je suis aussi concerné » le rattache
// comme suiveur au lieu de créer un ticket de plus.

// Le panneau apparaît dès 3 caractères et propose 1 à 3 tickets (docs/ecrans/03-creer-un-ticket.md)
export const TITRE_MIN = 3;
export const SUGGESTIONS_MAX = 3;
// Même limite que le titre d'un ticket : au-delà, ce n'est plus un titre
const RECHERCHE_MAX = 120;

// Entrée d'historique d'un rattachement : chaque entrée est un doublon évité (indicateur
// « Doublons évités » du pilotage, VIGIE-32). Un champ à part, et non « suiveurs », pour ne pas
// compter les suiveurs ajoutés autrement (doublon marqué par le support, VIGIE-16 ; copie, VIGIE-28).
export const CHAMP_CONCERNE = 'concerne';

// Le ticket n'est plus clos ni abandonné : seuls ceux-là peuvent être rejoints
const filtreOuvert = { statut: { $nin: STATUTS_CLOS } };

// Prépare le texte de la recherche. Renvoie null s'il est trop court : rien à chercher.
// Les guillemets et le tiret ont un sens pour $text (expression exacte, mot exclu) : un client
// qui tape « wi-fi » ou « "erreur » doit faire une recherche ordinaire, on les remplace par un espace.
export function texteRecherche(titre) {
  if (titre === undefined || titre === null) return null;
  if (typeof titre !== 'string') {
    throw new ErreurHttp(400, 'Titre : texte attendu');
  }
  const propre = titre.slice(0, RECHERCHE_MAX).replace(/["-]/g, ' ').trim();
  return propre.length >= TITRE_MIN ? propre : null;
}

// Plan A du cadrage 9.3 : titre, service, statut et date d'ouverture, rien d'autre.
// Ni description, ni demandeur, ni commentaires, ni pièces jointes, ni nombre de concernés.
// _id ne s'affiche pas : il sert seulement au bouton « Je suis aussi concerné ».
// dejaConcerne : le client suit déjà ce ticket (demandeur, suiveur ou en copie), le bouton est
// alors remplacé par « Vous êtes concerné ».
export function versSuggestion(ticket, utilisateur) {
  return {
    _id: String(ticket._id),
    titre: ticket.titre,
    service: ticket.service ? { nom: ticket.service.nom } : null,
    statut: ticket.statut,
    createdAt: ticket.createdAt,
    dejaConcerne: peutVoirTicket(utilisateur, ticket),
  };
}

// Tickets ouverts dont le titre ou la description ressemble au titre saisi, les plus proches
// d'abord (index textuel en français du schéma : racines des mots, mots vides ignorés).
// On ne passe pas par filtreTicketsVisibles : le but est justement de montrer des tickets d'autres
// demandeurs. C'est la projection de versSuggestion qui protège leur contenu.
export async function chercherSimilaires(titre, utilisateur) {
  const recherche = texteRecherche(titre);
  if (!recherche) return [];
  const tickets = await Ticket.find(
    { $text: { $search: recherche }, ...filtreOuvert },
    // demandeur, suiveurs et enCopie ne servent qu'à calculer dejaConcerne : jamais renvoyés
    { score: { $meta: 'textScore' } },
  )
    .select('titre service statut createdAt demandeur suiveurs enCopie')
    .populate('service', 'nom')
    .sort({ score: { $meta: 'textScore' } })
    .limit(SUGGESTIONS_MAX)
    .lean();
  return tickets.map((ticket) => versSuggestion(ticket, utilisateur));
}

// Vérifie qu'un client peut se déclarer concerné par ce ticket. Pure, pour être testée sans base.
// Renvoie true s'il le suit déjà : le rattachement est alors sans effet (pas compté deux fois).
export function verifierRattachement(ticket, utilisateur) {
  if (!ticket) {
    throw new ErreurHttp(404, 'Ticket introuvable');
  }
  if (STATUTS_CLOS.includes(ticket.statut)) {
    throw new ErreurHttp(409, 'Ce ticket est clos : déclarez un nouveau ticket');
  }
  if (String(ticket.demandeur) === String(utilisateur.id)) {
    throw new ErreurHttp(409, 'Vous avez vous-même déclaré ce ticket');
  }
  return (ticket.suiveurs ?? []).some((id) => String(id) === String(utilisateur.id));
}

// Écriture du rattachement : suiveur ajouté et entrée d'historique, en une seule opération.
// L'état attendu est dans le filtre (CONTRIBUTING, Requêtes MongoDB) : ticket toujours ouvert et
// client pas encore suiveur. Un double clic n'ajoute donc ni deux entrées, ni deux doublons évités.
export function preparerRattachement(id, utilisateur, maintenant) {
  return {
    filtre: {
      _id: id,
      ...filtreOuvert,
      demandeur: { $ne: utilisateur.id },
      suiveurs: { $ne: utilisateur.id },
    },
    miseAJour: {
      $addToSet: { suiveurs: utilisateur.id },
      $push: {
        historique: {
          auteur: utilisateur.id,
          champ: CHAMP_CONCERNE,
          ancienneValeur: null,
          nouvelleValeur: utilisateur.id,
          date: maintenant,
        },
      },
    },
  };
}

// Personnes concernées : le demandeur et les suiveurs (même calcul que « À traiter »)
function resume(ticket) {
  return {
    _id: String(ticket._id),
    reference: formaterNumero(ticket.numero),
    concernes: 1 + (ticket.suiveurs?.length ?? 0),
  };
}

const CHAMPS_RATTACHEMENT = 'numero statut demandeur suiveurs';

// « Je suis aussi concerné » : le client devient suiveur, il voit alors le ticket complet
// (visibiliteService) et en reçoit les notifications. Aucun ticket n'est créé.
// Le nombre de concernés n'est renvoyé qu'ici, une fois le ticket rejoint (cadrage 9.3).
export async function rejoindreTicket(id, utilisateur) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new ErreurHttp(404, 'Ticket introuvable');
  }
  const lire = () => Ticket.findById(id).select(CHAMPS_RATTACHEMENT).lean();
  const actuel = await lire();
  if (verifierRattachement(actuel, utilisateur)) {
    return resume(actuel);
  }

  const { filtre, miseAJour } = preparerRattachement(id, utilisateur, new Date());
  const ticket = await Ticket.findOneAndUpdate(filtre, miseAJour, { returnDocument: 'after' })
    .select(CHAMPS_RATTACHEMENT)
    .lean();
  if (!ticket) {
    // Changé entre la lecture et l'écriture : déjà rejoint (double clic), ou clos entre-temps
    const relu = await lire();
    if (verifierRattachement(relu, utilisateur)) {
      return resume(relu);
    }
    throw new ErreurHttp(409, 'Le ticket a été modifié entre-temps : réessayez');
  }

  const resultat = resume(ticket);
  // Compteur de personnes concernées (cadrage 5) : ni le nom ni l'identifiant du nouveau suiveur
  emettre([roomTicket(ticket._id), ROOM_SUPPORT], 'suiveur:ajoute', {
    _id: resultat._id,
    concernes: resultat.concernes,
  });
  return resultat;
}
