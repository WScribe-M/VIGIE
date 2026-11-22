import mongoose from 'mongoose';

import { Ticket, User } from '../models/index.js';
import { emettre, ROOM_PILOTAGE, ROOM_SUPPORT, roomTicket } from '../socket/index.js';
import { ErreurHttp } from '../utils/ErreurHttp.js';
import { STATUTS_CLOS } from './statutService.js';
import { lireTicket } from './ticketService.js';
import { filtreTicketsVisibles } from './visibiliteService.js';

// Assignation d'un technicien et commentaires sur un ticket (VIGIE-29).

export const COMMENTAIRE_MAX = 2000;

// Le responsable DSI a le rôle GESTIONNAIRE (cadrage §2) : comme pour le cycle de vie (VIGIE-7),
// tout le support peut attribuer un ticket. La route le vérifie déjà ; le service aussi, pour
// rester sûr s'il est appelé d'ailleurs.
const ROLES_SUPPORT = ['GESTIONNAIRE', 'ADMIN'];

function verifierId(id) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new ErreurHttp(404, 'Ticket introuvable');
  }
}

function signalerModification(ticket) {
  emettre([roomTicket(ticket._id), ROOM_SUPPORT, ROOM_PILOTAGE], 'ticket:modifie', {
    _id: String(ticket._id),
    statut: ticket.statut,
  });
}

// Modification à appliquer pour une attribution. Pure, pour être testée sans base.
// Un ticket encore NOUVEAU passe EN_COURS : être attribué vaut prise en charge (cadrage 3.1).
// Pas de motif dans l'historique : il s'afficherait sous la ligne de la frise (VIGIE-9), et le
// motif est réservé à ce que le demandeur doit lire (abandon, requalification…).
export function preparerAttribution(actuel, technicienId, utilisateur, maintenant) {
  if (STATUTS_CLOS.includes(actuel.statut)) {
    throw new ErreurHttp(409, 'Impossible d’attribuer un ticket clos');
  }
  if (String(actuel.technicien) === String(technicienId)) {
    throw new ErreurHttp(400, 'Ce technicien est déjà affecté au ticket');
  }

  const $set = { technicien: technicienId };
  const historique = [];
  if (actuel.statut === 'NOUVEAU') {
    Object.assign($set, {
      statut: 'EN_COURS',
      dateStatut: maintenant,
      datePriseEnCharge: maintenant,
    });
    historique.push({
      auteur: utilisateur.id,
      champ: 'statut',
      ancienneValeur: 'NOUVEAU',
      nouvelleValeur: 'EN_COURS',
      date: maintenant,
    });
  }
  historique.push({
    auteur: utilisateur.id,
    champ: 'technicien',
    ancienneValeur: actuel.technicien ?? null,
    nouvelleValeur: technicienId,
    date: maintenant,
  });

  return {
    // État attendu dans le filtre (CONTRIBUTING, requêtes MongoDB) : si un collègue a pris le
    // ticket ou changé son statut entre la lecture et l'écriture, rien n'est écrit (409)
    filtre: { _id: actuel._id, statut: actuel.statut, technicien: actuel.technicien ?? null },
    miseAJour: { $set, $push: { historique: { $each: historique } } },
  };
}

export async function attribuerTechnicien(id, technicienId, utilisateur, maintenant = new Date()) {
  if (!ROLES_SUPPORT.includes(utilisateur.role)) {
    throw new ErreurHttp(403, 'Seul le support peut attribuer un technicien');
  }
  verifierId(id);
  if (!mongoose.isObjectIdOrHexString(technicienId)) {
    throw new ErreurHttp(400, 'Technicien invalide');
  }

  const technicien = await User.findOne({ _id: technicienId, role: 'GESTIONNAIRE', actif: true })
    .select('_id')
    .lean();
  if (!technicien) {
    throw new ErreurHttp(400, 'Le technicien doit être un gestionnaire actif');
  }

  const actuel = await Ticket.findById(id).select('statut technicien').lean();
  if (!actuel) {
    throw new ErreurHttp(404, 'Ticket introuvable');
  }

  const { filtre, miseAJour } = preparerAttribution(
    actuel,
    technicien._id,
    utilisateur,
    maintenant,
  );
  const ticket = await Ticket.findOneAndUpdate(filtre, miseAJour, { returnDocument: 'after' })
    .select('_id statut')
    .lean();
  if (!ticket) {
    throw new ErreurHttp(409, 'Le ticket a été modifié entre-temps : rechargez-le');
  }

  signalerModification(ticket);
  return lireTicket(id, utilisateur);
}

// Texte d'un commentaire, nettoyé. Pure, pour être testée sans base.
export function verifierCommentaire(donnees) {
  const contenu = donnees?.texte;
  if (typeof contenu !== 'string' || !contenu.trim()) {
    throw new ErreurHttp(400, 'Le commentaire ne peut pas être vide');
  }
  const texte = contenu.trim();
  if (texte.length > COMMENTAIRE_MAX) {
    throw new ErreurHttp(400, `Le commentaire ne peut pas dépasser ${COMMENTAIRE_MAX} caractères`);
  }
  return texte;
}

// Tous ceux qui voient le ticket peuvent y commenter (demandeur, suiveurs, support), sauf le
// LECTEUR, en lecture seule. Les commentaires sont publics : les notes internes (VIGIE-47)
// devront être filtrées pour les CLIENT, à la lecture comme à l'émission Socket.io.
export async function ajouterCommentaire(id, donnees, utilisateur, maintenant = new Date()) {
  if (utilisateur.role === 'LECTEUR') {
    throw new ErreurHttp(403, 'Accès en lecture seule');
  }
  verifierId(id);
  const texte = verifierCommentaire(donnees);

  // Le filtre de visibilité dans la mise à jour : un ticket invisible n'est pas modifié
  const ticket = await Ticket.findOneAndUpdate(
    { _id: id, ...filtreTicketsVisibles(utilisateur) },
    { $push: { commentaires: { auteur: utilisateur.id, texte, date: maintenant } } },
    { returnDocument: 'after' },
  )
    .select('_id statut')
    .lean();
  if (!ticket) {
    // Même réponse pour un ticket inexistant ou invisible : on ne révèle pas les tickets des autres
    throw new ErreurHttp(404, 'Ticket introuvable');
  }

  signalerModification(ticket);
  return lireTicket(id, utilisateur);
}

// Gestionnaires actifs proposés dans la liste « Technicien responsable »
export async function listerGestionnaires() {
  return User.find({ role: 'GESTIONNAIRE', actif: true })
    .select('nom prenom')
    .sort({ nom: 1, prenom: 1 })
    .lean();
}
