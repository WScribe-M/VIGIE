import { Router } from 'express';

import {
  ajouterService,
  listerServicesAdmin,
  listerServicesPublics,
  mettreAJourService,
} from '../controllers/serviceController.js';

import { autoriser } from '../middlewares/auth.js';

export const serviceRoutes = Router();

// Catalogue des services pour les utilisateurs connectés.
serviceRoutes.get('/', listerServicesPublics);

// Administration : rôle ADMIN obligatoire.
serviceRoutes.get('/admin', autoriser('ADMIN'), listerServicesAdmin);

serviceRoutes.post('/', autoriser('ADMIN'), ajouterService);

serviceRoutes.patch('/:id', autoriser('ADMIN'), mettreAJourService);
