import { CircleAlert } from 'lucide-react';
import { useId } from 'react';
import { TRAIT_ICONE } from '../styles/icones.js';
import styles from './Champs.module.css';

// Libellé au-dessus, aide et message d'erreur en dessous (docs/ecrans/composants.md, Champs).
// L'aide et l'erreur sont reliées au champ par aria-describedby : le lecteur d'écran les annonce.
function Cadre({ id, libelle, obligatoire, facultatif, aide, compteur, erreur, children }) {
  return (
    <div className={styles.champ}>
      <label htmlFor={id} className={styles.libelle}>
        {libelle}
        {obligatoire && (
          <span className={styles.obligatoire} aria-hidden="true">
            {' '}
            *
          </span>
        )}
        {facultatif && <span className={styles.facultatif}> (facultatif)</span>}
      </label>
      {children}
      {erreur ? (
        <p id={`${id}-erreur`} className={styles.erreur}>
          <CircleAlert size={14} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
          {erreur}
        </p>
      ) : (
        (aide || compteur) && (
          <p id={`${id}-aide`} className={styles.aide}>
            {aide}
            {aide && compteur && ' · '}
            {compteur && (
              <span className="chiffres">
                {compteur.valeur} / {compteur.max}
              </span>
            )}
          </p>
        )
      )}
    </div>
  );
}

function proprietesCommunes(id, { obligatoire, aide, compteur, erreur, grand, zone }) {
  const classes = [
    styles.saisie,
    zone && styles.zone,
    grand && styles.grand,
    erreur && styles.enErreur,
  ];
  return {
    id,
    required: obligatoire,
    'aria-invalid': erreur ? true : undefined,
    'aria-describedby': erreur ? `${id}-erreur` : aide || compteur ? `${id}-aide` : undefined,
    className: classes.filter(Boolean).join(' '),
  };
}

/**
 * Champ texte d'une ligne. `grand` : 44 px (formulaires de création), sinon 40 px.
 * `compteur` : { valeur, max } affiché à droite de l'aide (« 18 / 120 »).
 */
export function TextField({
  libelle,
  obligatoire,
  facultatif,
  aide,
  compteur,
  erreur,
  grand,
  ...props
}) {
  const id = useId();
  return (
    <Cadre {...{ id, libelle, obligatoire, facultatif, aide, compteur, erreur }}>
      <input
        type="text"
        {...proprietesCommunes(id, { obligatoire, aide, compteur, erreur, grand })}
        {...props}
      />
    </Cadre>
  );
}

/** Zone de texte, hauteur minimale 112 px. Mêmes options que TextField. */
export function TextArea({
  libelle,
  obligatoire,
  facultatif,
  aide,
  compteur,
  erreur,
  grand,
  ...props
}) {
  const id = useId();
  return (
    <Cadre {...{ id, libelle, obligatoire, facultatif, aide, compteur, erreur }}>
      <textarea
        {...proprietesCommunes(id, { obligatoire, aide, compteur, erreur, grand, zone: true })}
        {...props}
      />
    </Cadre>
  );
}
