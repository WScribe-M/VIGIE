import { Router } from 'express';

import {
  attribuer,
  commenter,
  creer,
  estimer,
  file,
  gestionnaires,
  lire,
  lister,
  modifierDomaine,
  modifierStatut,
  prendre,
  requalifier,
} from '../controllers/ticketController.js';

import { autoriser } from '../middlewares/auth.js';

export const ticketRoutes = Router();

// Consultation et création des tickets.
ticketRoutes.post('/', creer);
ticketRoutes.get('/', lister);

// Routes fixes : toujours avant '/:id'.
ticketRoutes.get('/estimation', estimer);
ticketRoutes.get('/ma-file', autoriser('GESTIONNAIRE', 'ADMIN'), file);

// VIGIE-29 : gestionnaires actifs, réservés à l'ADMIN.
ticketRoutes.get('/gestionnaires', autoriser('ADMIN'), gestionnaires);

// Fiche d'un ticket.
ticketRoutes.get('/:id', lire);

// Correction du domaine par le support.
ticketRoutes.patch('/:id/domaine', autoriser('GESTIONNAIRE', 'ADMIN'), modifierDomaine);

// Cycle de vie du ticket (VIGIE-7).
ticketRoutes.post('/:id/prise-en-charge', autoriser('GESTIONNAIRE', 'ADMIN'), prendre);
ticketRoutes.patch('/:id/statut', autoriser('GESTIONNAIRE', 'ADMIN'), modifierStatut);

// Requalification de la priorité (VIGIE-5).
ticketRoutes.patch('/:id/priorite', autoriser('GESTIONNAIRE', 'ADMIN'), requalifier);

// VIGIE-29 : attribution par le responsable DSI.
ticketRoutes.patch('/:id/technicien', autoriser('ADMIN'), attribuer);

// VIGIE-29 : commentaires.
// Le CLIENT et le support peuvent commenter leurs tickets accessibles.
// Le LECTEUR reste en lecture seule.
ticketRoutes.post('/:id/commentaires', autoriser('CLIENT', 'GESTIONNAIRE', 'ADMIN'), commenter);
