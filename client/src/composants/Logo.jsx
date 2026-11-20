import styles from './Logo.module.css';

/**
 * Logo « vigie » (docs/ecrans/composants.md, Identité) : le V est un faisceau, le point la vigie
 * qui guette. La taille vient du parent (font-size de `className`), le symbole suit (0,7 em).
 */
export function Logo({ className }) {
  return (
    <span className={`${styles.logo} ${className ?? ''}`}>
      <svg viewBox="0 0 24 24" className={styles.symbole} aria-hidden="true">
        <polygon points="0,0 3.6,0 12,16.8 20.4,0 24,0 12,24" />
        <circle cx="12" cy="2.8" r="2.8" />
      </svg>
      vigie
    </span>
  );
}
