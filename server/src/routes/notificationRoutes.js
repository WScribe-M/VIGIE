import { Router } from 'express';
import { lire, lister, toutLire } from '../controllers/notificationController.js';

export const notificationRoutes = Router();

// Tout utilisateur connecté, pour ses propres notifications uniquement (filtre dans le service).
// Marquer comme lu est une écriture : le LECTEUR en est empêché par ROUTES_PROTEGEES ; il ne
// reçoit d'ailleurs aucune notification pour l'instant (seuls les GESTIONNAIRE, VIGIE-11).
notificationRoutes.get('/', lister);
// Avant '/:id/lu', pour que « lues » ne soit pas lu comme un identifiant
notificationRoutes.patch('/lues', toutLire);
notificationRoutes.patch('/:id/lu', lire);
