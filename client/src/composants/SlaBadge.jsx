import { ICONES_SLA, TRAIT_ICONE } from '../styles/icones.js';
import { LIBELLES_SLA } from '../styles/libelles.js';
import styles from './SlaBadge.module.css';

const TAILLES = {
  24: { classe: '', icone: 14 }, // tableaux
  26: { classe: styles.t26, icone: 15 }, // hauteur intermédiaire
  28: { classe: styles.t28, icone: 16 }, // en-tête de fiche ticket
};

const NIVEAUX = {
  DANS_LES_TEMPS: styles.ok,
  ECHEANCE_PROCHE: styles.proche,
  EN_RETARD: styles.retard,
  SUSPENDU: styles.suspendu,
};

// « Dans les temps · reste 2 h », « En retard de 3 h », « Suspendu · depuis 4 j »
function texteComplet(niveau, detail) {
  const libelle = LIBELLES_SLA[niveau];
  if (!detail) return libelle;
  return niveau === 'EN_RETARD' ? `${libelle} ${detail}` : `${libelle} · ${detail}`;
}

/**
 * Délai (SLA) : étiquette rectangulaire, horloge (ou pause) + libellé + temps restant.
 * @param niveau DANS_LES_TEMPS | ECHEANCE_PROCHE | EN_RETARD | SUSPENDU
 * @param detail temps formaté en fr-FR : « reste 2 h », « de 3 h » (en retard), « depuis 4 j »
 * @param court  n'affiche que le détail (cartes, mobile) ; le libellé reste lu par les lecteurs d'écran
 * @param taille 24 (par défaut) | 26 | 28
 */
export function SlaBadge({ niveau, detail, court = false, taille = 24 }) {
  const Icone = ICONES_SLA[niveau];
  // Niveau absent (ticket terminé) ou inconnu : ne rien afficher plutôt que faire planter toute la page
  if (!Icone) return null;
  const { classe, icone } = TAILLES[taille] ?? TAILLES[24];
  const complet = texteComplet(niveau, detail);
  const affiche = court && detail ? detail : complet;

  return (
    <span
      className={`${styles.badge} ${classe} ${court ? styles.court : ''} ${NIVEAUX[niveau]}`}
      title={affiche === complet ? undefined : complet}
    >
      <Icone size={icone} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
      {affiche === complet ? (
        complet
      ) : (
        <>
          <span aria-hidden="true">{affiche}</span>
          <span className="visuellement-cache">{complet}</span>
        </>
      )}
    </span>
  );
}
