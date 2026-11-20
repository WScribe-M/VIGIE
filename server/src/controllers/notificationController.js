import { listerNotifications, marquerLue, toutMarquerLu } from '../services/notificationService.js';

// Toujours les notifications de l'utilisateur du jeton : jamais un destinataire lu dans la requête

export async function lister(req, res) {
  const nonLuesSeulement = req.query.nonLues === 'true';
  res.json(await listerNotifications(req.utilisateur, { nonLuesSeulement }));
}

export async function lire(req, res) {
  res.json(await marquerLue(req.params.id, req.utilisateur));
}

export async function toutLire(req, res) {
  res.json(await toutMarquerLu(req.utilisateur));
}
