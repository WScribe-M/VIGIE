import { ICONES_STATUT, TRAIT_ICONE } from '../styles/icones.js';
import { LIBELLES_STATUT } from '../styles/libelles.js';
import styles from './StatusBadge.module.css';

// Mesures relevées dans les maquettes pour chaque hauteur de pastille
const TAILLES = {
  24: { classe: styles.t24, icone: 14 }, // listes, cartes
  26: { classe: styles.t26, icone: 15 }, // 02 Fondations
  28: { classe: styles.t28, icone: 16 }, // en-tête de fiche ticket
};

const COULEURS = {
  NOUVEAU: styles.nouveau,
  EN_COURS: styles.enCours,
  EN_ATTENTE_DEMANDEUR: styles.enAttente,
  TERMINE: styles.termine,
  ABANDONNE: styles.abandonne,
};

/**
 * Statut d'un ticket : pastille fond teinté + bordure + icône + libellé.
 * @param statut valeur de l'API (NOUVEAU, EN_COURS, EN_ATTENTE_DEMANDEUR, TERMINE, ABANDONNE)
 * @param taille 24 (par défaut) | 26 | 28
 */
export function StatusBadge({ statut, taille = 24 }) {
  const Icone = ICONES_STATUT[statut];
  const { classe, icone } = TAILLES[taille] ?? TAILLES[24];

  return (
    <span className={`${styles.badge} ${classe} ${COULEURS[statut]}`}>
      <Icone size={icone} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
      {LIBELLES_STATUT[statut]}
    </span>
  );
}
