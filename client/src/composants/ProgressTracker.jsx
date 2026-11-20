import { Check } from 'lucide-react';
import styles from './ProgressTracker.module.css';

/**
 * Frise « Où en est ma demande ? » (docs/ecrans/composants.md, ProgressTracker) : 4 jalons,
 * Reçu → Vu par le support → Pris en charge → Terminé (décision 9.11).
 *
 * @param jalons  [{ libelle, detail, etat: 'fait' | 'courant' | 'aVenir', mention }]
 *                `mention` : « En attente de votre réponse » sous le jalon courant
 * @param message phrase sous la frise
 */
export function ProgressTracker({ jalons, message }) {
  return (
    <section className={styles.carte} aria-labelledby="ou-en-est">
      <h2 id="ou-en-est" className={styles.titre}>
        Où en est ma demande ?
      </h2>
      <ol className={styles.jalons}>
        {jalons.map(({ libelle, detail, etat, mention }, index) => (
          <li
            key={libelle}
            className={`${styles.jalon} ${styles[etat]}`}
            aria-current={etat === 'courant' ? 'step' : undefined}
          >
            <span className={styles.ligne} aria-hidden="true">
              <span className={styles.rond}>
                {etat === 'fait' && <Check size={16} strokeWidth={3} />}
              </span>
              {index < jalons.length - 1 && <span className={styles.trait} />}
            </span>
            <span className={styles.libelle}>{libelle}</span>
            {detail && <span className={`${styles.detail} chiffres`}>{detail}</span>}
            {mention && <span className={styles.mention}>{mention}</span>}
            <span className="visuellement-cache">
              {etat === 'fait' ? ' (fait)' : etat === 'courant' ? ' (en cours)' : ' (à venir)'}
            </span>
          </li>
        ))}
      </ol>
      {message && <p className={styles.message}>{message}</p>}
    </section>
  );
}
