import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';
import { User } from '../models/index.js';
import { ErreurHttp } from '../utils/ErreurHttp.js';
import { creerJeton } from './jetonService.js';

// Hash d'un mot de passe quelconque : comparé quand l'e-mail n'existe pas, pour que la réponse
// prenne le même temps et ne révèle pas quels e-mails ont un compte
const HASH_FACTICE = bcrypt.hashSync('mot-de-passe-factice', 10);

export function hacherMotDePasse(motDePasse) {
  return bcrypt.hash(motDePasse, config.bcryptCost);
}

// Données renvoyées au client : jamais le mot de passe
export function profilPublic(utilisateur) {
  return {
    id: String(utilisateur._id),
    nom: utilisateur.nom,
    prenom: utilisateur.prenom,
    email: utilisateur.email,
    role: utilisateur.role,
  };
}

export async function connecter(email, motDePasse) {
  if (typeof email !== 'string' || typeof motDePasse !== 'string' || !email || !motDePasse) {
    throw new ErreurHttp(400, 'E-mail et mot de passe requis');
  }

  const utilisateur = await User.findOne({ email: email.toLowerCase().trim() }).select(
    '+motDePasse',
  );
  const valide = await bcrypt.compare(motDePasse, utilisateur?.motDePasse ?? HASH_FACTICE);

  // Même message pour un e-mail inconnu, un mauvais mot de passe ou un compte désactivé
  if (!utilisateur || !valide || !utilisateur.actif) {
    throw new ErreurHttp(401, 'Identifiants incorrects');
  }

  return { jeton: creerJeton(utilisateur), utilisateur: profilPublic(utilisateur) };
}

async function compteActif(id) {
  const utilisateur = await User.findById(id);
  if (!utilisateur || !utilisateur.actif) {
    throw new ErreurHttp(401, 'Compte introuvable ou désactivé');
  }
  return utilisateur;
}

export async function profil(id) {
  return profilPublic(await compteActif(id));
}

// Nouveau jeton avant l'expiration du précédent, pour ne pas couper la session (ni le temps réel).
// Le compte est relu en base : un compte désactivé ne peut plus prolonger sa session,
// et un rôle modifié par l'ADMIN est pris en compte dans le nouveau jeton.
export async function renouvelerJeton(id) {
  return { jeton: creerJeton(await compteActif(id)) };
}
