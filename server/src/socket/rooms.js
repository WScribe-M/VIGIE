import mongoose from 'mongoose';
import { Ticket } from '../models/index.js';
import { peutVoirTicket } from '../services/visibiliteService.js';

// Rooms Socket.io (cadrage, section 5). Les droits sont vérifiés ici, côté serveur :
// le client ne choisit jamais lui-même la room qu'il rejoint.

const ROLES_SUPPORT = ['GESTIONNAIRE', 'ADMIN'];
const ROLES_PILOTAGE = ['GESTIONNAIRE', 'LECTEUR', 'ADMIN'];

// Noms des rooms, à réutiliser par les services pour émettre (voir emettre() dans index.js)
export const roomUtilisateur = (id) => `user:${id}`;
export const roomTicket = (id) => `ticket:${id}`;
export const ROOM_SUPPORT = 'support';
export const ROOM_PILOTAGE = 'pilotage';

// Rooms rejointes dès la connexion, selon l'identité et le rôle lus dans le jeton
export function roomsAutomatiques(utilisateur) {
  const rooms = [roomUtilisateur(utilisateur.id)];
  if (ROLES_SUPPORT.includes(utilisateur.role)) {
    rooms.push(ROOM_SUPPORT);
  }
  if (ROLES_PILOTAGE.includes(utilisateur.role)) {
    rooms.push(ROOM_PILOTAGE);
  }
  return rooms;
}

// Ne charge que les champs utiles à peutVoirTicket
async function chargerTicket(ticketId) {
  return Ticket.findById(ticketId).select('demandeur suiveurs enCopie').lean();
}

// Rejoindre la room d'un ticket : mêmes règles de visibilité que l'API.
// Un ticket inexistant et un ticket interdit donnent la même réponse, pour ne pas révéler
// quels tickets existent. « charger » est remplaçable pour tester sans base de données.
export async function rejoindreTicket(socket, ticketId, charger = chargerTicket) {
  if (!mongoose.isObjectIdOrHexString(ticketId)) {
    return { ok: false, message: 'Ticket introuvable' };
  }
  const ticket = await charger(ticketId);
  if (!ticket || !peutVoirTicket(socket.data.utilisateur, ticket)) {
    return { ok: false, message: 'Ticket introuvable' };
  }
  await socket.join(roomTicket(ticketId));
  return { ok: true };
}

export async function quitterTicket(socket, ticketId) {
  if (!mongoose.isObjectIdOrHexString(ticketId)) {
    return { ok: false, message: 'Ticket introuvable' };
  }
  await socket.leave(roomTicket(ticketId));
  return { ok: true };
}
