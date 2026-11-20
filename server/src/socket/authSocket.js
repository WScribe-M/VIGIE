import { User } from '../models/index.js';
import { lireExpiration, verifierJeton } from '../services/jetonService.js';

// setTimeout n'accepte pas plus de 2^31 - 1 ms (environ 24 jours) : au-delà, il se déclenche aussitôt
const DELAI_MAX = 2 ** 31 - 1;

async function chargerCompte(id) {
  return User.findById(id).select('role actif').lean();
}

// Middleware du handshake : même règle que l'API, le jeton est obligatoire et l'identité
// et le rôle sont lus dans le jeton. Le client l'envoie dans io({ auth: { jeton } }),
// jamais dans l'adresse : elle finirait dans les journaux.
// Une connexion dure des heures et rejoint des rooms selon le rôle : on vérifie donc aussi
// en base que le compte est toujours actif et que son rôle n'a pas changé depuis la création
// du jeton (un client rétrogradé ne doit plus entrer dans « support »).
// « charger » est remplaçable pour tester sans base de données.
export async function authentifierSocket(socket, next, charger = chargerCompte) {
  const jeton = socket.handshake.auth?.jeton;
  if (typeof jeton !== 'string' || !jeton) {
    return next(new Error('Authentification requise'));
  }

  let utilisateur;
  let expiration;
  try {
    utilisateur = verifierJeton(jeton);
    expiration = lireExpiration(jeton);
  } catch {
    return next(new Error('Session invalide ou expirée'));
  }

  try {
    const compte = await charger(utilisateur.id);
    if (!compte || !compte.actif || compte.role !== utilisateur.role) {
      return next(new Error('Session invalide ou expirée'));
    }
  } catch (err) {
    console.error(err);
    return next(new Error('Erreur interne'));
  }

  socket.data.utilisateur = utilisateur;
  socket.data.expiration = expiration;
  next();
}

// Le jeton n'est vérifié qu'à la connexion : sans cette minuterie, une connexion ouverte
// continuerait à recevoir des événements après l'expiration du jeton.
// Après cette coupure, le client ne se reconnecte pas tout seul : c'est lui qui relance
// la connexion avec son jeton renouvelé (client/src/tempsReel/socket.js).
export function couperAExpiration(socket) {
  const delai = Math.min(Math.max(socket.data.expiration - Date.now(), 0), DELAI_MAX);
  const minuterie = setTimeout(() => socket.disconnect(true), delai);
  socket.on('disconnect', () => clearTimeout(minuterie));
}
