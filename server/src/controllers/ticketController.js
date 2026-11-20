import { chercherSimilaires, rejoindreTicket } from '../services/doublonService.js';
import {
  changerStatut,
  corrigerDomaine,
  creerTicket,
  estimerTicket,
  lireTicket,
  listerTickets,
  maFile,
  prendreEnCharge,
  requalifierPriorite,
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

export function estimer(req, res) {
  res.json(estimerTicket(req.query.impact, req.query.urgence));
}

export async function prendre(req, res) {
  res.json(await prendreEnCharge(req.params.id, req.utilisateur));
}

export async function modifierStatut(req, res) {
  res.json(await changerStatut(req.params.id, req.body, req.utilisateur));
}

export async function requalifier(req, res) {
  res.json(await requalifierPriorite(req.params.id, req.body, req.utilisateur));
}

export async function file(req, res) {
  res.json(await maFile(req.utilisateur));
}

// Doublons à la saisie (VIGIE-15)
export async function similaires(req, res) {
  res.json(await chercherSimilaires(req.query.titre, req.utilisateur));
}

export async function rejoindre(req, res) {
  res.json(await rejoindreTicket(req.params.id, req.utilisateur));
}
