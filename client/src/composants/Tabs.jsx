import { useId } from 'react';
import { TRAIT_ICONE } from '../styles/icones.js';
import styles from './Tabs.module.css';

// Onglets au style « souligné » (docs/ecrans/composants.md, Tabs ; décision du 20/11) : texte simple,
// seul l'onglet actif est surligné. Motif « tabs » de l'ARIA APG : un seul onglet dans l'ordre de
// tabulation (l'actif), les flèches passent d'un onglet à l'autre.

/**
 * @param libelle nom de la barre pour les lecteurs d'écran (aria-label)
 * @param onglets [{ valeur, libelle, icone?, compteur?, signal?, texteSignal? }]
 * @param valeur valeur de l'onglet actif
 * @param onChange appelé avec la valeur de l'onglet choisi
 * @param children contenu du panneau de l'onglet actif
 */
export function Tabs({ libelle, onglets, valeur, onChange, children }) {
  const id = useId();
  const idOnglet = (v) => `${id}-onglet-${v}`;
  const idPanneau = `${id}-panneau`;

  // ← → passent à l'onglet voisin (en boucle), Début et Fin au premier et au dernier.
  // L'onglet atteint est aussi ouvert : les panneaux sont déjà chargés, rien ne coûte à l'afficher.
  function surTouche(event) {
    const index = onglets.findIndex((onglet) => onglet.valeur === valeur);
    const cibles = {
      ArrowRight: (index + 1) % onglets.length,
      ArrowLeft: (index - 1 + onglets.length) % onglets.length,
      Home: 0,
      End: onglets.length - 1,
    };
    const cible = cibles[event.key];
    if (cible === undefined) return;
    event.preventDefault();
    onChange(onglets[cible].valeur);
    event.currentTarget.querySelectorAll('[role="tab"]')[cible].focus();
  }

  return (
    <div className={styles.onglets}>
      <div role="tablist" aria-label={libelle} className={styles.barre} onKeyDown={surTouche}>
        {onglets.map(
          ({ valeur: v, libelle: texte, icone: Icone, compteur, signal, texteSignal }) => {
            const actif = v === valeur;
            return (
              <button
                key={v}
                type="button"
                role="tab"
                id={idOnglet(v)}
                aria-selected={actif}
                aria-controls={actif ? idPanneau : undefined}
                tabIndex={actif ? 0 : -1}
                className={`${styles.onglet} ${actif ? styles.actif : ''}`}
                onClick={() => onChange(v)}
              >
                {Icone && <Icone size={16} strokeWidth={TRAIT_ICONE} aria-hidden="true" />}
                {/* data-texte réserve la largeur du gras : les onglets ne bougent pas au changement */}
                <span className={styles.libelle} data-texte={texte}>
                  {texte}
                </span>
                {compteur !== undefined && (
                  <span className={`${styles.compteur} chiffres`}>{compteur}</span>
                )}
                {signal && (
                  <>
                    <span className={styles.signal} aria-hidden="true" />
                    <span className="visuellement-cache">{texteSignal}</span>
                  </>
                )}
              </button>
            );
          },
        )}
      </div>
      <div role="tabpanel" id={idPanneau} aria-labelledby={idOnglet(valeur)}>
        {children}
      </div>
    </div>
  );
}
