import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

// Le jeton ne contient que l'identifiant et le rôle : jamais de donnée sensible
export function creerJeton(utilisateur) {
  return jwt.sign({ role: utilisateur.role }, config.jwtSecret, {
    subject: String(utilisateur._id ?? utilisateur.id),
    expiresIn: config.jwtExpiresIn,
  });
}

// Renvoie { id, role } ou lève une erreur si le jeton est invalide ou expiré.
// Réutilisée par le middleware Express et par le handshake Socket.io.
export function verifierJeton(jeton) {
  const contenu = jwt.verify(jeton, config.jwtSecret);
  return { id: contenu.sub, role: contenu.role };
}

// Date d'expiration en millisecondes, d'un jeton déjà vérifié par verifierJeton.
// Un jeton sans expiration est refusé : il ouvrirait une session sans fin.
export function lireExpiration(jeton) {
  const { exp } = jwt.decode(jeton);
  if (typeof exp !== 'number') {
    throw new Error('Jeton sans date d’expiration');
  }
  return exp * 1000;
}
