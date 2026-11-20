import { initiales, paireAvatar } from '../styles/avatar.js';
import styles from './Avatar.module.css';

const TAILLES = { 24: styles.t24, 32: styles.t32, 36: styles.t36, 40: styles.t40 };

/**
 * Avatar à initiales (docs/ecrans/composants.md). Sans prénom ni nom : « Non assigné ».
 * @param id     identifiant de la personne : fixe sa paire de couleurs
 * @param paire  1 à 6 pour imposer une paire (page /styleguide)
 * @param taille 24 | 32 (par défaut) | 36 (barre latérale) | 40
 */
export function Avatar({ prenom, nom, id, paire, taille = 32 }) {
  const classeTaille = TAILLES[taille] ?? TAILLES[32];

  if (!prenom && !nom) {
    return (
      <span className={`${styles.avatar} ${classeTaille} ${styles.nonAssigne}`} title="Non assigné">
        —
      </span>
    );
  }

  const numero = paire ?? paireAvatar(id ?? `${prenom} ${nom}`);
  return (
    <span
      className={`${styles.avatar} ${classeTaille}`}
      style={{
        background: `var(--color-avatar-${numero}-bg)`,
        color: `var(--color-avatar-${numero}-fg)`,
      }}
      aria-hidden="true"
    >
      {initiales(prenom, nom)}
    </span>
  );
}
