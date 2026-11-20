import { Ticket, X } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useNotifications } from '../notifications/NotificationsContext.jsx';
import { TRAIT_ICONE } from '../styles/icones.js';
import { LIBELLES_PRIORITE } from '../styles/libelles.js';
import styles from './Toasts.module.css';

// Durée d'affichage (docs/ecrans/composants.md, Toast) ; un ticket Critique reste jusqu'à une action
const DUREE = 6000;

// Toast temps réel « Nouveau ticket » (fiche 07). Décision du 20/11 : le toast informe, il ne sert
// pas à agir. Il ouvre seulement le ticket ; la prise en charge se fait depuis « Ma file » ou
// la fiche, où l'on voit l'état réel du ticket (le toast, lui, ne sait pas s'il a déjà été pris).
function ToastNouveauTicket({ notification }) {
  const { fermerToast, marquerLue } = useNotifications();
  const navigate = useNavigate();
  const { ticket } = notification;
  const critique = ticket.prioriteFinale === 'CRITIQUE';

  useEffect(() => {
    if (critique) return;
    const minuterie = setTimeout(() => fermerToast(notification._id), DUREE);
    return () => clearTimeout(minuterie);
  }, [critique, fermerToast, notification._id]);

  function ouvrir() {
    marquerLue(notification._id).catch(() => {});
    fermerToast(notification._id);
    navigate(`/tickets/${ticket._id}`);
  }

  // Décision du 20/11 : pas de bouton, tout le toast ouvre le ticket (comme les lignes de
  // « À traiter »). Pour le clavier et les lecteurs d'écran, le titre est un vrai bouton.
  return (
    <div className={styles.toast} role={critique ? 'alert' : 'status'} onClick={ouvrir}>
      <Ticket className={styles.icone} size={22} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
      <div className={styles.corps}>
        <span className={styles.direct}>
          <span className={styles.point} aria-hidden="true" />
          En direct · à l’instant
        </span>
        <button type="button" className={styles.titre}>
          Nouveau ticket · {LIBELLES_PRIORITE[ticket.prioriteFinale]} · {ticket.service?.nom}
        </button>
        <span className={`${styles.texte} chiffres`}>
          {ticket.reference} · {ticket.titre}
        </span>
      </div>
      <button
        type="button"
        className={styles.fermer}
        aria-label="Fermer"
        onClick={(event) => {
          // La croix ferme seulement : elle ne doit pas ouvrir le ticket
          event.stopPropagation();
          fermerToast(notification._id);
        }}
      >
        <X size={16} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
      </button>
    </div>
  );
}

/** Pile de toasts en haut à droite (3 au plus), au-dessus de toutes les pages connectées */
export function Toasts() {
  const { toasts } = useNotifications();
  return (
    <div className={styles.pile} aria-live="polite">
      {toasts.map((notification) => (
        <ToastNouveauTicket key={notification._id} notification={notification} />
      ))}
    </div>
  );
}
