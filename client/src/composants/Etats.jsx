import { CircleAlert, RefreshCw } from 'lucide-react';
import { TRAIT_ICONE } from '../styles/icones.js';
import { Button } from './Button.jsx';
import styles from './Etats.module.css';

// États génériques d'un écran (docs/ecrans/composants.md, EmptyState, ErrorState, Skeleton) :
// icône 32 sans illustration, un titre, un texte, une seule action. Jamais de spinner isolé.

/** Liste vide : `action` est un élément (souvent un <Button>), facultatif. */
export function EmptyState({ icone: Icone, titre, texte, action }) {
  return (
    <div className={styles.carte}>
      {Icone && (
        <Icone className={styles.icone} size={32} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
      )}
      <p className={styles.titre}>{titre}</p>
      {texte && <p className={styles.texte}>{texte}</p>}
      {action}
    </div>
  );
}

/** Erreur de chargement, avec « Réessayer » si `onReessayer` est fourni. */
export function ErrorState({ titre, texte, onReessayer }) {
  return (
    <div className={styles.carte} role="alert">
      <CircleAlert
        className={styles.iconeErreur}
        size={32}
        strokeWidth={TRAIT_ICONE}
        aria-hidden="true"
      />
      <p className={styles.titre}>{titre}</p>
      {texte && <p className={styles.texte}>{texte}</p>}
      {onReessayer && (
        <Button icone={RefreshCw} onClick={onReessayer}>
          Réessayer
        </Button>
      )}
    </div>
  );
}

/** Bloc de chargement aux dimensions du contenu attendu (largeur et hauteur en CSS). */
export function Skeleton({ largeur = '100%', hauteur = 16, rond = false }) {
  return (
    <span
      className={`${styles.squelette} ${rond ? styles.rond : ''}`}
      style={{ width: largeur, height: hauteur }}
      aria-hidden="true"
    />
  );
}
