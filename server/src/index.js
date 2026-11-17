import { app } from './app.js';
import { connecterBase } from './config/db.js';
import { config } from './config/env.js';

try {
  await connecterBase();
  app.listen(config.port, () => {
    console.log(`API VIGIE démarrée sur http://localhost:${config.port}`);
  });
} catch (err) {
  console.error('Démarrage impossible :', err.message);
  process.exit(1);
}
