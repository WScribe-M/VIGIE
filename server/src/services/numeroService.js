import { Compteur } from '../models/Compteur.js';

// Numéro lisible des tickets (VIG-0042) : plus simple à dicter au téléphone ou à rechercher
// qu'un ObjectId. Le numéro est stocké en nombre, le préfixe n'est ajouté qu'à l'affichage.

// Réservé à la création d'un ticket (VIGIE-3). Atomique : $inc et upsert en une seule opération.
export async function prochainNumeroTicket(modele = Compteur) {
  const compteur = await modele.findOneAndUpdate(
    { _id: 'tickets' },
    { $inc: { valeur: 1 } },
    { upsert: true, returnDocument: 'after' },
  );
  return compteur.valeur;
}

export function formaterNumero(numero) {
  return `VIG-${String(numero).padStart(4, '0')}`;
}

// Accepte « VIG-0042 », « vig-42 » ou « 42 » (recherche, VIGIE-6) ; null si ce n'est pas un numéro
export function lireNumero(texte) {
  const resultat = /^\s*(?:vig-?)?0*(\d+)\s*$/i.exec(String(texte ?? ''));
  return resultat ? Number(resultat[1]) : null;
}
