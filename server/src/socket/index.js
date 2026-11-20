import { Server } from 'socket.io';
import { config } from '../config/env.js';
import { authentifierSocket, couperAExpiration } from './authSocket.js';
import { quitterTicket, rejoindreTicket, roomsAutomatiques } from './rooms.js';

export { ROOM_PILOTAGE, ROOM_SUPPORT, roomTicket, roomUtilisateur } from './rooms.js';

let io = null;

// Événements envoyés par le client : uniquement sans effet durable (cadrage, section 5).
// Le second argument est l'accusé de réception : le client sait si l'accès est accepté.
// Usage côté client : socket.emit('ticket:rejoindre', ticketId, (reponse) => …)
function ecouterClient(socket) {
  socket.on('ticket:rejoindre', (ticketId, repondre) =>
    repondreA(ticketId, repondre, () => rejoindreTicket(socket, ticketId)),
  );
  socket.on('ticket:quitter', (ticketId, repondre) =>
    repondreA(ticketId, repondre, () => quitterTicket(socket, ticketId)),
  );
}

// Une erreur (base indisponible…) ne doit ni faire tomber le serveur, ni partir au client en détail
async function repondreA(ticketId, repondre, action) {
  // emit('ticket:rejoindre', callback) sans identifiant : la fonction arrive en premier argument
  if (typeof ticketId === 'function') {
    return ticketId({ ok: false, message: 'Ticket introuvable' });
  }
  let reponse;
  try {
    reponse = await action();
  } catch (err) {
    console.error(err);
    reponse = { ok: false, message: 'Erreur interne' };
  }
  if (typeof repondre === 'function') {
    repondre(reponse);
  }
}

// Branche Socket.io sur le serveur HTTP de l'API (index.js)
export function demarrerTempsReel(serveurHttp) {
  io = new Server(serveurHttp, { cors: { origin: config.clientUrl } });
  io.use(authentifierSocket);
  io.on('connection', (socket) => {
    couperAExpiration(socket);
    socket.join(roomsAutomatiques(socket.data.utilisateur));
    ecouterClient(socket);
  });
  return io;
}

// Pour les services, après l'enregistrement en base (l'API REST reste la source de vérité) :
// emettre(roomTicket(ticket._id), 'commentaire:cree', commentaire)
// Sans serveur démarré (tests), l'appel ne fait rien.
export function emettre(rooms, evenement, donnees) {
  io?.to(rooms).emit(evenement, donnees);
}
