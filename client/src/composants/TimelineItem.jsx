import { ArrowRight } from 'lucide-react';
import { TRAIT_ICONE } from '../styles/icones.js';
import styles from './TimelineItem.module.css';

// Historique (docs/ecrans/06-fiche-ticket-gestionnaire.md, « Historique (TimelineItem) », et
// capture composants-03-frise.png) : qui, quoi, quand, par ordre chronologique, avant → après.

/** Liste des éléments de l'historique, reliés par un trait vertical. */
export function Timeline({ libelle, children }) {
  return (
    <ol className={styles.frise} aria-label={libelle}>
      {children}
    </ol>
  );
}

/**
 * Un changement : « avant → après » (deux StatusBadge, deux priorités ou deux textes).
 * La flèche est décorative : « devient » est lu par les lecteurs d'écran.
 */
export function Changement({ avant, apres }) {
  return (
    <span className={styles.changement}>
      {avant}
      <ArrowRight
        className={styles.fleche}
        size={14}
        strokeWidth={TRAIT_ICONE}
        aria-hidden="true"
      />
      <span className={styles.masque}>devient</span>
      {apres}
    </span>
  );
}

/**
 * Un élément de l'historique.
 * @param icone      composant Lucide (Plus, User, Flag…), 16 px dans un rond Lin
 * @param auteur     nom affiché en gras (« Mamadou Koné »)
 * @param action     suite de la phrase (« a requalifié la priorité »)
 * @param changement facultatif : <Changement avant={…} apres={…} />
 * @param motif      facultatif : affiché dans un encart « Motif : … »
 * @param date       date ISO de l'API ; `dateAffichee` : la même, déjà formatée
 */
export function TimelineItem({
  icone: Icone,
  auteur,
  action,
  changement,
  motif,
  date,
  dateAffichee,
}) {
  return (
    <li className={styles.element}>
      <span className={styles.rond}>
        <Icone size={16} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
      </span>
      <div className={styles.contenu}>
        <p className={styles.phrase}>
          {auteur && <strong>{auteur}</strong>} {action}
        </p>
        {changement}
        {motif && (
          <p className={styles.motif}>
            <strong>Motif :</strong> {motif}
          </p>
        )}
        <time className={`${styles.date} chiffres`} dateTime={date}>
          {dateAffichee}
        </time>
      </div>
    </li>
  );
}
