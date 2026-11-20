import { io } from 'socket.io-client';
import { jetonStocke } from '../api.js';

// Connexion temps réel unique pour toute l'application.
// Les pages l'utilisent ainsi :
//   socket.on('commentaire:cree', afficher) ... socket.off('commentaire:cree', afficher)
//   socket.emit('ticket:rejoindre', ticketId, (reponse) => { if (!reponse.ok) … })
// Le serveur reste la source de vérité : après une coupure, les pages rechargent leurs données
// par l'API (événement 'connect').
export const socket = io({
  // Ouverte par AuthContext une fois l'utilisateur connecté, pas au chargement de la page
  autoConnect: false,
  // Fonction et non objet : le jeton est relu à chaque tentative, donc une reconnexion
  // utilise toujours le dernier jeton renouvelé
  auth: (envoyer) => envoyer({ jeton: jetonStocke.lire() }),
});

socket.on('disconnect', (raison) => {
  // Le serveur coupe la connexion quand le jeton expire. Socket.io ne se reconnecte pas tout
  // seul dans ce cas : on relance si un jeton (renouvelé) est disponible.
  if (raison === 'io server disconnect' && jetonStocke.lire()) {
    socket.connect();
  }
});

// Après un renouvellement : reconnecter pour que le serveur prenne en compte la nouvelle
// date d'expiration (il ne relit le jeton qu'à la connexion)
export function reconnecterSocket() {
  if (socket.connected) {
    socket.disconnect().connect();
  }
}
