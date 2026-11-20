import { Router } from 'express';
import {
  creer,
  estimer,
  file,
  lire,
  lister,
  modifierDomaine,
  modifierStatut,
  prendre,
  requalifier,
} from '../controllers/ticketController.js';
import { autoriser } from '../middlewares/auth.js';

export const ticketRoutes = Router();

// Tout utilisateur connecté ; le LECTEUR est bloqué en écriture par ROUTES_PROTEGEES (app.js)
ticketRoutes.post('/', creer);
ticketRoutes.get('/', lister);
// Avant '/:id', sinon « estimation » serait lu comme un identifiant de ticket
ticketRoutes.get('/estimation', estimer);
// « Ma file » du technicien (VIGIE-31), elle aussi avant '/:id'
ticketRoutes.get('/ma-file', autoriser('GESTIONNAIRE', 'ADMIN'), file);
ticketRoutes.get('/:id', lire);

// Le support corrige le domaine (ticket « Autre », mauvais service choisi)
ticketRoutes.patch('/:id/domaine', autoriser('GESTIONNAIRE', 'ADMIN'), modifierDomaine);

// Cycle de vie (VIGIE-7) : tout le support fait avancer un ticket (une seule équipe), chaque
// action est tracée dans l'historique avec son auteur
ticketRoutes.post('/:id/prise-en-charge', autoriser('GESTIONNAIRE', 'ADMIN'), prendre);
ticketRoutes.patch('/:id/statut', autoriser('GESTIONNAIRE', 'ADMIN'), modifierStatut);

// Requalification de la priorité (VIGIE-5) : le support seul, jamais le demandeur
ticketRoutes.patch('/:id/priorite', autoriser('GESTIONNAIRE', 'ADMIN'), requalifier);
