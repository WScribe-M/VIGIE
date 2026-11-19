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
// Réutilisée par le middleware Express et, plus tard, par le handshake Socket.io (VIGIE-12).
export function verifierJeton(jeton) {
  const contenu = jwt.verify(jeton, config.jwtSecret);
  return { id: contenu.sub, role: contenu.role };
}
