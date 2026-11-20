import mongoose from 'mongoose';

import { Ticket, User } from '../models/index.js';
import { emettre, ROOM_PILOTAGE, ROOM_SUPPORT, roomTicket } from '../socket/index.js';
import { ErreurHttp } from '../utils/ErreurHttp.js';
import { lireTicket } from './ticketService.js';
import { filtreTicketsVisibles } from './visibiliteService.js';

const COMMENTAIRE_MAX = 2000;
const STATUTS_CLOS = ['TERMINE', 'ABANDONNE'];

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

// Seul le responsable DSI (ADMIN) peut attribuer un ticket
// à un autre gestionnaire ou changer son affectation.
export async function attribuerTechnicien(id, technicienId, utilisateur) {
  if (utilisateur.role !== 'ADMIN') {
    throw new ErreurHttp(403, 'Seul le responsable DSI peut attribuer un technicien');
  }

  verifierId(id);

  if (!mongoose.isObjectIdOrHexString(technicienId)) {
    throw new ErreurHttp(400, 'Technicien invalide');
  }

  const technicien = await User.findOne({
    _id: technicienId,
    role: 'GESTIONNAIRE',
    actif: true,
  })
    .select('_id')
    .lean();

  if (!technicien) {
    throw new ErreurHttp(400, 'Le technicien doit être un gestionnaire actif');
  }

  const actuel = await Ticket.findById(id).select('statut technicien datePriseEnCharge').lean();

  if (!actuel) {
    throw new ErreurHttp(404, 'Ticket introuvable');
  }

  if (STATUTS_CLOS.includes(actuel.statut)) {
    throw new ErreurHttp(409, 'Impossible d’attribuer un ticket clos');
  }

  if (String(actuel.technicien) === String(technicienId)) {
    throw new ErreurHttp(400, 'Ce technicien est déjà affecté au ticket');
  }

  const maintenant = new Date();
  const nouveau = actuel.statut === 'NOUVEAU';

  const historique = [
    {
      auteur: utilisateur.id,
      champ: 'technicien',
      ancienneValeur: actuel.technicien ?? null,
      nouvelleValeur: technicien._id,
      motif: 'Attribution par le responsable DSI',
      date: maintenant,
    },
  ];

  const modifications = {
    technicien: technicien._id,
  };

  // L'attribution d'un nouveau ticket vaut prise en charge.
  if (nouveau) {
    modifications.statut = 'EN_COURS';
    modifications.dateStatut = maintenant;
    modifications.datePriseEnCharge = maintenant;

    historique.unshift({
      auteur: utilisateur.id,
      champ: 'statut',
      ancienneValeur: 'NOUVEAU',
      nouvelleValeur: 'EN_COURS',
      motif: 'Attribution par le responsable DSI',
      date: maintenant,
    });
  }

  // Le filtre conditionnel empêche deux affectations simultanées
  // d'écraser silencieusement leurs modifications respectives.
  const ticket = await Ticket.findOneAndUpdate(
    {
      _id: id,
      statut: actuel.statut,
      technicien: actuel.technicien ?? null,
    },
    {
      $set: modifications,
      $push: { historique: { $each: historique } },
    },
    { returnDocument: 'after' },
  )
    .select('_id statut')
    .lean();

  if (!ticket) {
    throw new ErreurHttp(409, 'Le ticket a été modifié entre-temps : rechargez-le');
  }

  signalerModification(ticket);

  return lireTicket(id, utilisateur);
}

// Tous les utilisateurs pouvant voir un ticket peuvent y commenter,
// sauf le LECTEUR qui dispose uniquement d'un accès en lecture.
export async function ajouterCommentaire(id, donnees, utilisateur) {
  if (utilisateur.role === 'LECTEUR') {
    throw new ErreurHttp(403, 'Accès en lecture seule');
  }

  verifierId(id);

  const contenu = donnees?.texte;

  if (typeof contenu !== 'string' || !contenu.trim()) {
    throw new ErreurHttp(400, 'Le commentaire ne peut pas être vide');
  }

  const texte = contenu.trim();

  if (texte.length > COMMENTAIRE_MAX) {
    throw new ErreurHttp(400, `Le commentaire ne peut pas dépasser ${COMMENTAIRE_MAX} caractères`);
  }

  const ticket = await Ticket.findOneAndUpdate(
    {
      _id: id,
      ...filtreTicketsVisibles(utilisateur),
    },
    {
      $push: {
        commentaires: {
          auteur: utilisateur.id,
          texte,
          date: new Date(),
        },
      },
    },
    { returnDocument: 'after' },
  )
    .select('_id statut')
    .lean();

  if (!ticket) {
    // Même réponse pour un ticket inexistant ou invisible :
    // on ne révèle pas les tickets des autres demandeurs.
    throw new ErreurHttp(404, 'Ticket introuvable');
  }

  signalerModification(ticket);

  return lireTicket(id, utilisateur);
}

// Liste proposée dans la sélection du responsable DSI.
export async function listerGestionnaires(utilisateur) {
  if (utilisateur.role !== 'ADMIN') {
    throw new ErreurHttp(403, 'Accès réservé au responsable DSI');
  }

  return User.find({
    role: 'GESTIONNAIRE',
    actif: true,
  })
    .select('nom prenom')
    .sort({ nom: 1, prenom: 1 })
    .lean();
}
