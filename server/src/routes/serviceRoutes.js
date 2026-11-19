import { Router } from 'express';

import {
  ajouterService,
  listerServicesAdmin,
  listerServicesPublics,
  mettreAJourService,
} from '../controllers/serviceController.js';

import { authentifier, autoriser } from '../middlewares/auth.js';

export const serviceRoutes = Router();

// Catalogue disponible pour le formulaire de création.
serviceRoutes.get('/', listerServicesPublics);

// Administration du catalogue : rôle ADMIN obligatoire.
serviceRoutes.get('/admin', authentifier, autoriser('ADMIN'), listerServicesAdmin);

serviceRoutes.post('/', authentifier, autoriser('ADMIN'), ajouterService);

serviceRoutes.patch('/:id', authentifier, autoriser('ADMIN'), mettreAJourService);
