import { Router } from 'express';
import { creer, estimer, lire, lister, modifierDomaine } from '../controllers/ticketController.js';
import { autoriser } from '../middlewares/auth.js';

export const ticketRoutes = Router();

// Tout utilisateur connecté ; le LECTEUR est bloqué en écriture par ROUTES_PROTEGEES (app.js)
ticketRoutes.post('/', creer);
ticketRoutes.get('/', lister);
// Avant '/:id', sinon « estimation » serait lu comme un identifiant de ticket
ticketRoutes.get('/estimation', estimer);
ticketRoutes.get('/:id', lire);

// Le support corrige le domaine (ticket « Autre », mauvais service choisi)
ticketRoutes.patch('/:id/domaine', autoriser('GESTIONNAIRE', 'ADMIN'), modifierDomaine);
