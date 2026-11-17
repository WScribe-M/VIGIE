import cors from 'cors';
import express from 'express';
import { config } from './config/env.js';
import { etatBase } from './config/db.js';

export const app = express();

app.use(cors({ origin: config.clientUrl }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: etatBase() });
});

// Route inconnue
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Route introuvable' });
});

// Erreur non gérée : on ne renvoie jamais le détail technique au client
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status ?? 500).json({ message: err.status ? err.message : 'Erreur interne' });
});
