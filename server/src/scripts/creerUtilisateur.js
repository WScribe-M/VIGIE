// Crée ou met à jour un compte, en attendant l'écran d'administration (VIGIE-37) et le seed (VIGIE-23).
// Usage : npm run utilisateur -- <email> <motDePasse> <ROLE> [prenom] [nom]
import mongoose from 'mongoose';
import { connecterBase } from '../config/db.js';
import { User } from '../models/index.js';
import { ROLES } from '../models/constantes.js';
import { hacherMotDePasse } from '../services/authService.js';

const [email, motDePasse, role, prenom = 'Prénom', nom = 'Nom'] = process.argv.slice(2);

if (!email || !motDePasse || !ROLES.includes(role)) {
  console.error(
    `Usage : npm run utilisateur -- <email> <motDePasse> <${ROLES.join('|')}> [prenom] [nom]`,
  );
  process.exit(1);
}
if (motDePasse.length < 8) {
  console.error('Le mot de passe doit contenir au moins 8 caractères');
  process.exit(1);
}

await connecterBase();
const utilisateur = await User.findOneAndUpdate(
  { email: email.toLowerCase() },
  { email, prenom, nom, role, actif: true, motDePasse: await hacherMotDePasse(motDePasse) },
  { upsert: true, returnDocument: 'after', runValidators: true },
);
console.log(`Compte prêt : ${utilisateur.email} (${utilisateur.role})`);
await mongoose.disconnect();
