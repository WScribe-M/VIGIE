import mongoose from 'mongoose';
import { config } from './env.js';

export async function connecterBase() {
  await mongoose.connect(config.mongodbUri);
  console.log(`MongoDB connecté (${mongoose.connection.name})`);
}

export function etatBase() {
  // 0 = déconnecté, 1 = connecté, 2 = connexion en cours, 3 = déconnexion en cours
  return ['déconnectée', 'connectée', 'connexion en cours', 'déconnexion en cours'][
    mongoose.connection.readyState
  ];
}
