import { Check, CircleAlert } from 'lucide-react';
import { useId, useRef } from 'react';
import { TRAIT_ICONE } from '../styles/icones.js';
import styles from './ChoiceCard.module.css';

const SUIVANT = ['ArrowRight', 'ArrowDown'];
const PRECEDENT = ['ArrowLeft', 'ArrowUp'];

/**
 * Question à cartes de choix (docs/ecrans/composants.md, ChoiceCard) : un groupe de boutons radio.
 * Comportement clavier d'un groupe radio : Tab entre dans le groupe sur la carte choisie (ou la
 * première), les flèches changent de choix.
 *
 * @param question texte de la question (« Qui est touché ? »)
 * @param options  [{ valeur, titre, description, icone }]
 * @param valeur   valeur choisie, ou null
 * @param onChange (valeur) => void
 * @param compacte cartes de 44 px, icône à gauche, sans description (choix du service)
 */
export function ChoiceGroup({
  question,
  obligatoire,
  options,
  valeur,
  onChange,
  erreur,
  compacte,
}) {
  const idQuestion = useId();
  const cartes = useRef([]);
  const indexChoisi = options.findIndex((option) => option.valeur === valeur);

  function choisir(index) {
    onChange(options[index].valeur);
    cartes.current[index]?.focus();
  }

  function surTouche(event, index) {
    const nombre = options.length;
    if (SUIVANT.includes(event.key)) {
      event.preventDefault();
      choisir((index + 1) % nombre);
    } else if (PRECEDENT.includes(event.key)) {
      event.preventDefault();
      choisir((index - 1 + nombre) % nombre);
    } else if (event.key === ' ') {
      event.preventDefault();
      choisir(index);
    }
  }

  return (
    <div className={`${styles.groupe} ${compacte ? styles.compacte : ''}`}>
      <p id={idQuestion} className={styles.question}>
        {question}
        {obligatoire && (
          <span className={styles.obligatoire} aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={idQuestion}
        aria-required={obligatoire || undefined}
        aria-invalid={erreur ? true : undefined}
        className={styles.cartes}
      >
        {options.map(({ valeur: valeurOption, titre, description, icone: Icone }, index) => {
          const choisie = index === indexChoisi;
          // Une seule carte atteignable au clavier : la choisie, sinon la première
          const atteignable = choisie || (indexChoisi === -1 && index === 0);
          return (
            <button
              key={valeurOption}
              ref={(element) => (cartes.current[index] = element)}
              type="button"
              role="radio"
              aria-checked={choisie}
              tabIndex={atteignable ? 0 : -1}
              className={`${styles.carte} ${choisie ? styles.choisie : ''}`}
              onClick={() => choisir(index)}
              onKeyDown={(event) => surTouche(event, index)}
            >
              {!compacte && (
                <span className={styles.rond} aria-hidden="true">
                  {choisie && <Check size={12} strokeWidth={3} />}
                </span>
              )}
              {Icone && (
                <Icone
                  className={styles.icone}
                  size={compacte ? 18 : 22}
                  strokeWidth={TRAIT_ICONE}
                  aria-hidden="true"
                />
              )}
              <span className={styles.titre}>{titre}</span>
              {description && <span className={styles.description}>{description}</span>}
            </button>
          );
        })}
      </div>
      {erreur && (
        <p className={styles.erreur}>
          <CircleAlert size={14} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
          {erreur}
        </p>
      )}
    </div>
  );
}
