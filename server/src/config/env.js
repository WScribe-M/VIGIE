import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Le fichier .env est à la racine du dépôt, partagé par le client et le serveur
const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
dotenv.config({ path: path.join(racine, '.env'), quiet: true });

function requis(nom) {
  const valeur = process.env[nom];
  if (!valeur) {
    throw new Error(`Variable d'environnement manquante : ${nom} (voir .env.example)`);
  }
  return valeur;
}

// Coût bcrypt imposé par le cadrage : entre 10 et 12
const bcryptCost = Number(process.env.BCRYPT_COST ?? 12);
if (!Number.isInteger(bcryptCost) || bcryptCost < 10 || bcryptCost > 12) {
  throw new Error('BCRYPT_COST doit être un entier entre 10 et 12');
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  mongodbUri: requis('MONGODB_URI'),
  jwtSecret: requis('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  bcryptCost,
};
