import cors from 'cors';
import express from 'express';
import { config } from './config/env.js';
import { etatBase } from './config/db.js';
import { authentifier, interdireEcritureLecteur } from './middlewares/auth.js';
import { authRoutes } from './routes/authRoutes.js';

export const app = express();

app.use(cors({ origin: config.clientUrl }));
app.use(express.json());

// Routes publiques
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: etatBase() });
});
app.use('/api/auth', authRoutes);

// Toutes les routes déclarées après cette ligne exigent un jeton valide,
// et le LECTEUR ne peut y faire que de la lecture
app.use('/api', authentifier, interdireEcritureLecteur);

// Brancher ici les routes protégées, par exemple : app.use('/api/services', serviceRoutes);

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
