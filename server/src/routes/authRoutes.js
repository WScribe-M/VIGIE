import { Router } from 'express';
import { connexion, moi } from '../controllers/authController.js';
import { authentifier } from '../middlewares/auth.js';

export const authRoutes = Router();

authRoutes.post('/connexion', connexion); // seule route publique avec /api/health
authRoutes.get('/moi', authentifier, moi);
