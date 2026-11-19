import mongoose from 'mongoose';
import { config } from './env.js';
// Enregistre tous les modèles, pour que syncIndexes() les connaisse quel que soit le point d'entrée
import '../models/index.js';

export async function connecterBase() {
  await mongoose.connect(config.mongodbUri);
  console.log(`MongoDB connecté (${mongoose.connection.name})`);
  // Aligne les index de la base sur ceux des schémas. Sans cela, Mongoose ajoute les nouveaux
  // index mais garde les anciens : un index textuel en anglais bloquerait celui en français
  // (un seul index textuel par collection).
  await mongoose.syncIndexes();
}

export function etatBase() {
  // 0 = déconnecté, 1 = connecté, 2 = connexion en cours, 3 = déconnexion en cours
  return ['déconnectée', 'connectée', 'connexion en cours', 'déconnexion en cours'][
    mongoose.connection.readyState
  ];
}
