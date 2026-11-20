import http from 'node:http';
import { app } from './app.js';
import { connecterBase } from './config/db.js';
import { config } from './config/env.js';
import { demarrerTempsReel } from './socket/index.js';

try {
  await connecterBase();
  // Un serveur HTTP partagé : Express répond aux requêtes, Socket.io aux connexions temps réel
  const serveur = http.createServer(app);
  demarrerTempsReel(serveur);
  serveur.listen(config.port, () => {
    console.log(`API VIGIE démarrée sur http://localhost:${config.port}`);
  });
} catch (err) {
  console.error('Démarrage impossible :', err.message);
  process.exit(1);
}
