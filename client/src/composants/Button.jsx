import { LoaderCircle } from 'lucide-react';
import { TRAIT_ICONE } from '../styles/icones.js';
import styles from './Button.module.css';

// `etat` force l'affichage d'un état (survol, focus, actif) : réservé à la page /styleguide,
// pour comparer avec la maquette. Dans les écrans, l'état vient du navigateur.
function classes(...noms) {
  return noms.filter(Boolean).join(' ');
}

/**
 * Bouton du design system (docs/ecrans/composants.md, capture composants-03-boutons).
 * Une seule action `primaire` par écran.
 *
 * @param variante   'primaire' | 'secondaire' | 'tertiaire' | 'danger'
 * @param taille     'md' (40 px, par défaut) | 'sm' (32 px)
 * @param icone      composant Lucide affiché avant le libellé
 * @param iconeApres composant Lucide affiché après le libellé (ex. « Voir tout → »)
 * @param chargement libellé pendant l'action (« Création… ») : le bouton est alors inactif
 */
export function Button({
  variante = 'primaire',
  taille = 'md',
  icone: Icone,
  iconeApres: IconeApres,
  chargement,
  etat,
  type = 'button',
  disabled,
  className,
  children,
  ...props
}) {
  const enChargement = Boolean(chargement);
  const tailleIcone = taille === 'sm' ? 15 : 16;

  return (
    <button
      type={type}
      className={classes(
        styles.bouton,
        styles[variante],
        taille === 'sm' && styles.sm,
        enChargement && styles.enChargement,
        className,
      )}
      disabled={disabled || enChargement}
      aria-busy={enChargement || undefined}
      data-etat={etat}
      {...props}
    >
      {enChargement ? (
        <LoaderCircle
          className={styles.rotation}
          size={tailleIcone}
          strokeWidth={TRAIT_ICONE}
          aria-hidden="true"
        />
      ) : (
        Icone && <Icone size={tailleIcone} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
      )}
      {enChargement ? chargement : children}
      {!enChargement && IconeApres && (
        <IconeApres size={tailleIcone} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
      )}
    </button>
  );
}

/**
 * Bouton icône seule, 40 × 40 (recherche, cloche, menu « … »).
 * `libelle` est obligatoire : c'est le seul texte lu par les lecteurs d'écran.
 */
export function IconButton({ icone: Icone, libelle, etat, className, type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={classes(styles.boutonIcone, className)}
      aria-label={libelle}
      title={libelle}
      data-etat={etat}
      {...props}
    >
      <Icone size={20} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
    </button>
  );
}
