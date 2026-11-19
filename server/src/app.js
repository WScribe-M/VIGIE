import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/env.js';
import { etatBase } from './config/db.js';
import { specificationApi } from './docs/specificationApi.js';
import { authentifier, interdireEcritureLecteur } from './middlewares/auth.js';
import { authRoutes } from './routes/authRoutes.js';

// Routes protégées : jeton obligatoire (401) et LECTEUR en lecture seule (403).
// Toute nouvelle route se déclare ici, la protection est ajoutée automatiquement,
// et se documente dans server/docs/openapi.yaml.
// Exemple : '/services': serviceRoutes
const ROUTES_PROTEGEES = {};

export const app = express();

app.use(cors({ origin: config.clientUrl }));
app.use(express.json());

// Routes publiques
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: etatBase() });
});
app.use('/api/auth', authRoutes);

// Documentation de l'API (server/docs/openapi.yaml) : publique, elle ne contient aucune donnée.
// Elle doit être déclarée avant la route 404, sinon /api/docs serait « Route introuvable ».
app.get('/api/docs/openapi.json', (req, res) => {
  res.json(specificationApi);
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specificationApi));

// La protection ne s'applique qu'aux préfixes qui existent : une adresse inconnue
// répond « Route introuvable » au lieu d'un 401 trompeur
for (const [chemin, routes] of Object.entries(ROUTES_PROTEGEES)) {
  app.use(`/api${chemin}`, authentifier, interdireEcritureLecteur, routes);
}

// Route inconnue
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Route introuvable' });
});

// Erreur non gérée : on ne renvoie jamais le détail technique au client
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Corps JSON mal formé
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Requête invalide' });
  }
  if (!err.status) {
    console.error(err);
  }
  res.status(err.status ?? 500).json({ message: err.status ? err.message : 'Erreur interne' });
});
