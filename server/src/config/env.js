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

// Heures ouvrées du SLA (cadrage 9.2) : « 09:00 » → minutes depuis minuit
function lireHeure(nom, defaut) {
  const texte = process.env[nom] ?? defaut;
  const resultat = /^(\d{2}):(\d{2})$/.exec(texte);
  if (!resultat || Number(resultat[1]) > 23 || Number(resultat[2]) > 59) {
    throw new Error(`${nom} doit être une heure au format HH:MM`);
  }
  return Number(resultat[1]) * 60 + Number(resultat[2]);
}

// Jours ouvrés : 1 = lundi … 7 = dimanche
const slaJours = (process.env.SLA_WORK_DAYS ?? '1,2,3,4,5').split(',').map(Number);
if (!slaJours.length || slaJours.some((jour) => !Number.isInteger(jour) || jour < 1 || jour > 7)) {
  throw new Error('SLA_WORK_DAYS doit lister des jours de 1 (lundi) à 7 (dimanche)');
}
const slaDebut = lireHeure('SLA_WORK_START', '09:00');
const slaFin = lireHeure('SLA_WORK_END', '18:00');
if (slaFin <= slaDebut) {
  throw new Error('SLA_WORK_END doit être après SLA_WORK_START');
}
// Part du délai écoulée à partir de laquelle l'échéance est « proche » (alerte orange, cadrage 9.2)
const slaSeuilAlerte = Number(process.env.SLA_WARNING_RATIO ?? 0.75);
if (!(slaSeuilAlerte > 0 && slaSeuilAlerte < 1)) {
  throw new Error('SLA_WARNING_RATIO doit être un nombre entre 0 et 1 (exemple : 0.75)');
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  mongodbUri: requis('MONGODB_URI'),
  jwtSecret: requis('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  bcryptCost,
  sla: { jours: slaJours, debut: slaDebut, fin: slaFin, seuilAlerte: slaSeuilAlerte },
};
