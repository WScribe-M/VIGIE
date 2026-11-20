import { creerService, listerServices, modifierService } from '../services/serviceService.js';

// Catalogue public : seuls les services actifs sont visibles.
export async function listerServicesPublics(req, res) {
  const services = await listerServices();

  res.status(200).json(services);
}

// Catalogue ADMIN : inclut aussi les services désactivés.
export async function listerServicesAdmin(req, res) {
  const services = await listerServices({
    inclureInactifs: true,
  });

  res.status(200).json(services);
}

// Création d'un nouveau service par un administrateur.
export async function ajouterService(req, res) {
  const service = await creerService(req.body);

  res.status(201).json(service);
}

// Modification ou désactivation d'un service existant.
export async function mettreAJourService(req, res) {
  const service = await modifierService(req.params.id, req.body);

  res.status(200).json(service);
}
