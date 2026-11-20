import { PRIORITES } from '../models/constantes.js';
import { ErreurHttp } from '../utils/ErreurHttp.js';

// Matrice impact × urgence (cadrage 9.1, VIGIE-5). La priorité n'est jamais saisie par le
// demandeur : il répond à deux questions, le serveur en déduit la priorité.
// Lignes : impact (qui est touché ?). Colonnes : urgence (peut-on continuer à travailler ?).
const MATRICE = {
  FORT: { FAIBLE: 'MOYENNE', MOYENNE: 'HAUTE', HAUTE: 'CRITIQUE' },
  MOYEN: { FAIBLE: 'BASSE', MOYENNE: 'MOYENNE', HAUTE: 'HAUTE' },
  FAIBLE: { FAIBLE: 'BASSE', MOYENNE: 'BASSE', HAUTE: 'MOYENNE' },
};

// Impact et urgence doivent avoir été validés (IMPACTS et URGENCES de constantes.js)
export function calculerPriorite(impact, urgence) {
  return MATRICE[impact][urgence];
}

// Requalification par le support (VIGIE-5) : le motif est obligatoire pour qu'on ne puisse pas
// remettre le délai SLA à zéro sans justification (décisions des 19 et 20/11/2026)
export const MOTIF_MIN = 10;
// Garde-fou contre un texte démesuré, comme les autres motifs (statutService)
const MOTIF_MAX = 500;
// Texte de la fiche 06, affiché tel quel sous le champ « Motif * »
const MESSAGE_MOTIF = `Indiquez un motif (${MOTIF_MIN} caractères minimum).`;

// Vérifie une requalification et renvoie ce qu'il faut enregistrer. `actuelle` : prioriteFinale.
export function verifierRequalification(actuelle, donnees) {
  const { priorite, motif } = donnees ?? {};
  if (!PRIORITES.includes(priorite)) {
    throw new ErreurHttp(400, 'Priorité invalide');
  }
  if (priorite === actuelle) {
    throw new ErreurHttp(400, 'Le ticket a déjà cette priorité');
  }
  if (motif !== undefined && motif !== null && typeof motif !== 'string') {
    throw new ErreurHttp(400, 'Motif : texte attendu');
  }
  // Les espaces ne comptent pas : « ok        » ne justifie rien
  const propre = (motif ?? '').trim();
  if (propre.length < MOTIF_MIN) {
    throw new ErreurHttp(400, MESSAGE_MOTIF);
  }
  if (propre.length > MOTIF_MAX) {
    throw new ErreurHttp(400, `Motif : ${MOTIF_MAX} caractères au maximum`);
  }
  return { priorite, motif: propre };
}
