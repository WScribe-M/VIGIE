import {
  corrigerDomaine,
  creerTicket,
  lireTicket,
  listerTickets,
} from '../services/ticketService.js';

// L'utilisateur vient toujours du jeton (req.utilisateur), jamais du corps de la requête

export async function creer(req, res) {
  res.status(201).json(await creerTicket(req.body, req.utilisateur));
}

export async function lister(req, res) {
  res.json(await listerTickets(req.utilisateur));
}

export async function lire(req, res) {
  res.json(await lireTicket(req.params.id, req.utilisateur));
}

export async function modifierDomaine(req, res) {
  res.json(await corrigerDomaine(req.params.id, req.body?.domaine, req.utilisateur));
}
