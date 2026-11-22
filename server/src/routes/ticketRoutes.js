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
  rejoindre,
  requalifier,
  similaires,
} from '../controllers/ticketController.js';
import { autoriser } from '../middlewares/auth.js';

export const ticketRoutes = Router();

// Tout utilisateur connecté ; le LECTEUR est bloqué en écriture par ROUTES_PROTEGEES (app.js)
ticketRoutes.post('/', creer);
ticketRoutes.get('/', lister);
// Avant '/:id', sinon « estimation » serait lu comme un identifiant de ticket
ticketRoutes.get('/estimation', estimer);
// « À traiter » du technicien (VIGIE-31), elle aussi avant '/:id'
ticketRoutes.get('/ma-file', autoriser('GESTIONNAIRE', 'ADMIN'), file);
// Suggestions de doublons pendant la saisie du titre (VIGIE-15), elle aussi avant '/:id'.
// Réservée au CLIENT, qui déclare ses incidents : le support voit déjà tous les tickets.
ticketRoutes.get('/similaires', autoriser('CLIENT'), similaires);
// Gestionnaires actifs proposés pour l'attribution (VIGIE-29), elle aussi avant '/:id'
ticketRoutes.get('/gestionnaires', autoriser('GESTIONNAIRE', 'ADMIN'), gestionnaires);
ticketRoutes.get('/:id', lire);

// « Je suis aussi concerné » (VIGIE-15) : le client connecté devient suiveur du ticket
ticketRoutes.post('/:id/suiveurs', autoriser('CLIENT'), rejoindre);

// Le support corrige le domaine (ticket « Autre », mauvais service choisi)
ticketRoutes.patch('/:id/domaine', autoriser('GESTIONNAIRE', 'ADMIN'), modifierDomaine);

// Cycle de vie (VIGIE-7) : tout le support fait avancer un ticket (une seule équipe), chaque
// action est tracée dans l'historique avec son auteur
ticketRoutes.post('/:id/prise-en-charge', autoriser('GESTIONNAIRE', 'ADMIN'), prendre);
ticketRoutes.patch('/:id/statut', autoriser('GESTIONNAIRE', 'ADMIN'), modifierStatut);

// Requalification de la priorité (VIGIE-5) : le support seul, jamais le demandeur
ticketRoutes.patch('/:id/priorite', autoriser('GESTIONNAIRE', 'ADMIN'), requalifier);

// Attribution à un technicien (VIGIE-29). Le responsable DSI a le rôle GESTIONNAIRE (cadrage §2) :
// comme pour le cycle de vie, tout le support peut attribuer ou réattribuer un ticket
ticketRoutes.patch('/:id/technicien', autoriser('GESTIONNAIRE', 'ADMIN'), attribuer);

// Commentaires (VIGIE-29) : le demandeur, les suiveurs et le support, sur les tickets qu'ils voient.
// Le LECTEUR est déjà bloqué en écriture par ROUTES_PROTEGEES (app.js)
ticketRoutes.post('/:id/commentaires', autoriser('CLIENT', 'GESTIONNAIRE', 'ADMIN'), commenter);
