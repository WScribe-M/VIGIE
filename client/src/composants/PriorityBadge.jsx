import { LIBELLES_PRIORITE } from '../styles/libelles.js';
import styles from './PriorityBadge.module.css';

const BARRES_ACTIVES = { BASSE: 1, MOYENNE: 2, HAUTE: 3, CRITIQUE: 4 };

const COULEURS = {
  BASSE: styles.basse,
  MOYENNE: styles.moyenne,
  HAUTE: styles.haute,
  CRITIQUE: styles.critique,
};

// Barres de signal (vigie-kit.js) : SVG 14 × 12, quatre barres de 2,4 px,
// hauteurs 4 / 6,67 / 9,33 / 12, barres inactives à 25 % d'opacité
function BarresSignal({ actives }) {
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" aria-hidden="true" className={styles.barres}>
      {[0, 1, 2, 3].map((k) => {
        const hauteur = 4 + k * 2.667;
        return (
          <rect
            key={k}
            x={k * 3.8}
            y={12 - hauteur}
            width="2.4"
            height={hauteur}
            rx="0.6"
            fill="currentColor"
            opacity={k < actives ? 1 : 0.25}
          />
        );
      })}
    </svg>
  );
}

/**
 * Priorité : barres de signal sans fond + libellé coloré ; Critique en pastille pleine.
 * La priorité est calculée (impact × urgence), jamais choisie par l'utilisateur.
 * @param priorite valeur de l'API (BASSE, MOYENNE, HAUTE, CRITIQUE)
 * @param taille   24 (par défaut) | 26
 */
export function PriorityBadge({ priorite, taille = 24 }) {
  return (
    <span className={`${styles.badge} ${taille === 26 ? styles.t26 : ''} ${COULEURS[priorite]}`}>
      <BarresSignal actives={BARRES_ACTIVES[priorite]} />
      {LIBELLES_PRIORITE[priorite]}
    </span>
  );
}
