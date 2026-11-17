import { verifierJeton } from '../services/jetonService.js';

// Vérifie le JWT de l'en-tête « Authorization: Bearer <jeton> ».
// L'identité et le rôle viennent du jeton, jamais du corps de la requête.
export function authentifier(req, res, next) {
  const [type, jeton] = (req.headers.authorization ?? '').split(' ');
  if (type !== 'Bearer' || !jeton) {
    return res.status(401).json({ message: 'Authentification requise' });
  }
  try {
    req.utilisateur = verifierJeton(jeton);
    next();
  } catch {
    res.status(401).json({ message: 'Session invalide ou expirée' });
  }
}

// À placer après authentifier : autoriser('ADMIN') ou autoriser('GESTIONNAIRE', 'ADMIN')
export function autoriser(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.utilisateur?.role)) {
      return res.status(403).json({ message: 'Accès interdit' });
    }
    next();
  };
}

// Le LECTEUR (direction, audit) consulte tout mais ne modifie rien
export function interdireEcritureLecteur(req, res, next) {
  const lecture = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  if (req.utilisateur?.role === 'LECTEUR' && !lecture) {
    return res.status(403).json({ message: 'Accès en lecture seule' });
  }
  next();
}
