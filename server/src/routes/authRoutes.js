import { Router } from 'express';
import { connexion, moi, renouveler } from '../controllers/authController.js';
import { authentifier } from '../middlewares/auth.js';

export const authRoutes = Router();

authRoutes.post('/connexion', connexion); // seule route publique avec /api/health
authRoutes.get('/moi', authentifier, moi);
// Exception à ROUTES_PROTEGEES, comme /moi : le préfixe /api/auth contient la connexion, qui est
// publique, et la lecture seule ajoutée par ROUTES_PROTEGEES bloquerait ce POST pour le LECTEUR.
// authentifier est donc ajouté ici à la main.
authRoutes.post('/renouveler', authentifier, renouveler);
