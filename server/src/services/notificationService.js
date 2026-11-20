import mongoose from 'mongoose';
import { Notification, Ticket, User } from '../models/index.js';
import { emettre, ROOM_SUPPORT, roomUtilisateur } from '../socket/index.js';
import { ErreurHttp } from '../utils/ErreurHttp.js';
import { formaterNumero } from './numeroService.js';

// Notifications (cadrage 5, VIGIE-11) : chaque notification est d'abord enregistrée en base, puis
// émise dans la room personnelle user:<id>. Une personne hors ligne la retrouve à sa connexion
// (GET /api/notifications) : le badge de la cloche reste exact.

// Panneau : les 50 plus récentes suffisent (les lues sont supprimées au bout de 90 jours)
const LISTE_MAX = 50;
const CHAMPS_TICKET = 'numero titre prioriteFinale service';

// Forme renvoyée par l'API et par Socket.io : la même, pour que le client n'ait qu'un format
function versClient(notification, ticket) {
  return {
    _id: String(notification._id),
    type: notification.type,
    lu: notification.lu,
    date: notification.date,
    ticket: ticket && {
      _id: String(ticket._id),
      reference: formaterNumero(ticket.numero),
      titre: ticket.titre,
      prioriteFinale: ticket.prioriteFinale,
      service: ticket.service ? { nom: ticket.service.nom } : null,
    },
  };
}

// Nouveau ticket : une notification pour chaque GESTIONNAIRE actif (décision du 20/11), sauf la
// personne qui a créé le ticket. L'ADMIN ne gère pas les tickets au quotidien : il n'en reçoit pas.
export async function notifierNouveauTicket(ticketId, createurId) {
  const ticket = await Ticket.findById(ticketId)
    .select(CHAMPS_TICKET)
    .populate('service', 'nom')
    .lean();
  const gestionnaires = await User.find({
    role: 'GESTIONNAIRE',
    actif: true,
    _id: { $ne: createurId },
  })
    .select('_id')
    .lean();

  const notifications = await Notification.insertMany(
    gestionnaires.map(({ _id }) => ({
      destinataire: _id,
      type: 'NOUVEAU_TICKET',
      ticket: ticketId,
    })),
  );
  for (const notification of notifications) {
    emettre(
      roomUtilisateur(notification.destinataire),
      'notification:nouvelle',
      versClient(notification, ticket),
    );
  }
  // Pour les listes du support (« À traiter », VIGIE-31) : elles se rechargent par l'API
  emettre(ROOM_SUPPORT, 'ticket:cree', { _id: String(ticketId) });
}

// Mes notifications, les plus récentes d'abord, et le nombre de non lues (badge de la cloche)
export async function listerNotifications(utilisateur, { nonLuesSeulement = false } = {}) {
  const filtre = { destinataire: utilisateur.id };
  if (nonLuesSeulement) filtre.lu = false;

  const [notifications, nonLues] = await Promise.all([
    Notification.find(filtre)
      .select('type lu date ticket')
      .sort({ date: -1 })
      .limit(LISTE_MAX)
      .populate({
        path: 'ticket',
        select: CHAMPS_TICKET,
        populate: { path: 'service', select: 'nom' },
      })
      .lean(),
    Notification.countDocuments({ destinataire: utilisateur.id, lu: false }),
  ]);
  return { notifications: notifications.map((n) => versClient(n, n.ticket)), nonLues };
}

// Le destinataire est dans le filtre : on ne peut marquer que ses propres notifications.
// Celle d'un autre répond 404, comme une notification inexistante.
export async function marquerLue(id, utilisateur) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new ErreurHttp(404, 'Notification introuvable');
  }
  const resultat = await Notification.updateOne(
    { _id: id, destinataire: utilisateur.id },
    { $set: { lu: true } },
  );
  if (!resultat.matchedCount) {
    throw new ErreurHttp(404, 'Notification introuvable');
  }
  return {
    nonLues: await Notification.countDocuments({ destinataire: utilisateur.id, lu: false }),
  };
}

export async function toutMarquerLu(utilisateur) {
  await Notification.updateMany(
    { destinataire: utilisateur.id, lu: false },
    { $set: { lu: true } },
  );
  return { nonLues: 0 };
}
