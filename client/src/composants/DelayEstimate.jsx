import { Clock } from 'lucide-react';
import { TRAIT_ICONE } from '../styles/icones.js';
import { formaterEcheance } from '../utils/dates.js';
import styles from './DelayEstimate.module.css';

/**
 * Délai de traitement estimé (docs/ecrans/03-creer-un-ticket.md) : l'échéance SLA calculée par le
 * serveur, jamais un délai fixe (décision du cadrage 9.11).
 *
 * @param estimation { prioriteCalculee, echeanceSla } renvoyé par GET /api/tickets/estimation,
 *                   ou null tant que les deux questions n'ont pas de réponse (état « en attente »)
 */
export function DelayEstimate({ estimation }) {
  if (!estimation) {
    return (
      <div className={`${styles.encart} ${styles.enAttente}`} aria-live="polite">
        <Clock className={styles.icone} size={22} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
        <div className={styles.textes}>
          <span className={styles.libelle}>Délai de traitement estimé · en attente</span>
          <span className={styles.attente}>
            Répondez aux deux questions pour connaître le délai.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.encart} aria-live="polite">
      <Clock className={styles.icone} size={22} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
      <div className={styles.textes}>
        <span className={styles.libelle}>Délai de traitement estimé</span>
        <span className={styles.valeur}>
          Résolution prévue avant {formaterEcheance(estimation.echeanceSla)}
        </span>
      </div>
    </div>
  );
}
