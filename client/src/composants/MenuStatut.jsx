import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { LIBELLES_STATUT } from '../styles/libelles.js';
import { Button } from './Button.jsx';
import styles from './MenuStatut.module.css';
import { StatusBadge } from './StatusBadge.jsx';

// Note affichée à droite de chaque statut (docs/ecrans/06-fiche-ticket-gestionnaire.md)
const NOTES = {
  EN_ATTENTE_DEMANDEUR: 'Suspend le délai',
  TERMINE: 'Cause et solution requises',
  ABANDONNE: 'Motif requis',
};

// Ordre de la capture : « Nouveau » en dernier, puisqu'on n'y revient jamais.
// Les valeurs viennent de libelles.js (donc de constantes.js), seul l'ordre change.
const ORDRE_DU_MENU = [
  ...Object.keys(LIBELLES_STATUT).filter((statut) => statut !== 'NOUVEAU'),
  'NOUVEAU',
];

/**
 * Menu « Changer le statut » de la fiche gestionnaire.
 * Les statuts possibles viennent de l'API (`transitionsPossibles`) : la règle n'est pas recopiée ici.
 *
 * @param statut      statut actuel du ticket
 * @param possibles   statuts autorisés depuis le statut actuel
 * @param onChoisir   (statut) => void
 */
export function MenuStatut({ statut, possibles, onChoisir, disabled }) {
  const [ouvert, setOuvert] = useState(false);
  const refMenu = useRef(null);

  // Fermeture au clic en dehors et avec Échap, comme un menu natif
  useEffect(() => {
    if (!ouvert) return;
    const fermerSiDehors = (event) => {
      if (!refMenu.current?.contains(event.target)) setOuvert(false);
    };
    const fermerAvecEchap = (event) => event.key === 'Escape' && setOuvert(false);
    document.addEventListener('mousedown', fermerSiDehors);
    document.addEventListener('keydown', fermerAvecEchap);
    return () => {
      document.removeEventListener('mousedown', fermerSiDehors);
      document.removeEventListener('keydown', fermerAvecEchap);
    };
  }, [ouvert]);

  return (
    <div className={styles.conteneur} ref={refMenu}>
      <Button
        iconeApres={ChevronDown}
        className={ouvert ? styles.boutonOuvert : undefined}
        aria-haspopup="menu"
        aria-expanded={ouvert}
        disabled={disabled}
        onClick={() => setOuvert(!ouvert)}
      >
        Changer le statut
      </Button>
      {ouvert && (
        <ul className={styles.menu} role="menu" aria-label="Changer le statut">
          {ORDRE_DU_MENU.map((valeur) => {
            const actuel = valeur === statut;
            const possible = possibles.includes(valeur);
            const note = actuel ? 'Actuel' : possible ? NOTES[valeur] : 'Impossible';
            return (
              <li key={valeur} role="none">
                <button
                  type="button"
                  role="menuitem"
                  className={`${styles.option} ${actuel ? styles.actuel : ''}`}
                  disabled={!possible}
                  onClick={() => {
                    setOuvert(false);
                    onChoisir(valeur);
                  }}
                >
                  <StatusBadge statut={valeur} />
                  {note && <span className={styles.note}>{note}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
