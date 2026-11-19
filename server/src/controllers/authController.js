import { connecter, profil } from '../services/authService.js';

// Express 5 transmet automatiquement les erreurs des fonctions async au gestionnaire d'erreurs

export async function connexion(req, res) {
  const { email, motDePasse } = req.body ?? {};
  res.json(await connecter(email, motDePasse));
}

export async function moi(req, res) {
  res.json(await profil(req.utilisateur.id));
}
