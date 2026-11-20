import { STATUTS } from '../models/constantes.js';
import { ErreurHttp } from '../utils/ErreurHttp.js';

// Cycle de vie d'un ticket (cadrage 3.1) : statut actuel → statuts possibles.
// Aucun retour vers NOUVEAU ; ABANDONNE est définitif.
export const TRANSITIONS = {
  NOUVEAU: ['EN_COURS', 'ABANDONNE'],
  EN_COURS: ['EN_ATTENTE_DEMANDEUR', 'TERMINE', 'ABANDONNE'],
  EN_ATTENTE_DEMANDEUR: ['EN_COURS', 'TERMINE', 'ABANDONNE'],
  TERMINE: ['EN_COURS'],
  ABANDONNE: [],
};

// Passages qui ont leur propre action, et non le menu « Changer le statut » :
// ils posent d'autres champs (technicien, réouverture) avec leurs propres règles.
const AUTRES_ACTIONS = {
  'NOUVEAU>EN_COURS': 'Utilisez « Prendre en charge »',
  'TERMINE>EN_COURS': 'La réouverture passe par la contestation (VIGIE-30)',
};

export const STATUTS_CLOS = ['TERMINE', 'ABANDONNE'];
const TEXTE_MAX = 500;

// Statuts proposés dans le menu « Changer le statut » de la fiche gestionnaire
export function transitionsDuMenu(statut) {
  return (TRANSITIONS[statut] ?? []).filter((vers) => !AUTRES_ACTIONS[`${statut}>${vers}`]);
}

function texte(valeur, libelle, obligatoire) {
  if (valeur === undefined || valeur === null || valeur === '') {
    if (obligatoire) throw new ErreurHttp(400, `${libelle} obligatoire`);
    return undefined;
  }
  if (typeof valeur !== 'string') {
    throw new ErreurHttp(400, `${libelle} : texte attendu`);
  }
  const propre = valeur.trim();
  if (obligatoire && !propre) throw new ErreurHttp(400, `${libelle} obligatoire`);
  if (propre.length > TEXTE_MAX) {
    throw new ErreurHttp(400, `${libelle} : ${TEXTE_MAX} caractères au maximum`);
  }
  return propre || undefined;
}

// Vérifie un changement demandé par le menu et renvoie ce qu'il faut enregistrer.
// Abandon : motif obligatoire. Terminé : cause et solution obligatoires (cadrage 9.9).
export function verifierChangement(depuis, vers, donnees = {}) {
  if (!STATUTS.includes(vers)) {
    throw new ErreurHttp(400, 'Statut invalide');
  }
  const autreAction = AUTRES_ACTIONS[`${depuis}>${vers}`];
  if (autreAction) {
    throw new ErreurHttp(400, autreAction);
  }
  if (!transitionsDuMenu(depuis).includes(vers)) {
    throw new ErreurHttp(400, 'Transition de statut non autorisée');
  }

  const motif = texte(donnees.motif, 'Motif', vers === 'ABANDONNE');
  if (vers !== 'TERMINE') {
    return { motif };
  }
  return {
    motif,
    resolution: {
      cause: texte(donnees.cause, 'Cause', true),
      solution: texte(donnees.solution, 'Solution', true),
    },
  };
}
