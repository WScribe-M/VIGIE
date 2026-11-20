import { Ticket, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { appelerApi } from '../api.js';
import { useNotifications } from '../notifications/NotificationsContext.jsx';
import { TRAIT_ICONE } from '../styles/icones.js';
import { LIBELLES_PRIORITE } from '../styles/libelles.js';
import { Button } from './Button.jsx';
import styles from './Toasts.module.css';

// Durée d'affichage (docs/ecrans/composants.md, Toast) ; un ticket Critique reste jusqu'à une action
const DUREE = 6000;

// Toast temps réel « Nouveau ticket » (fiche 07) : « Ouvrir » ou « Prendre en charge » directement
function ToastNouveauTicket({ notification }) {
  const { fermerToast, marquerLue } = useNotifications();
  const navigate = useNavigate();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
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

  async function prendreEnCharge() {
    setEnCours(true);
    try {
      await appelerApi(`/tickets/${ticket._id}/prise-en-charge`, { methode: 'POST' });
      ouvrir();
    } catch (err) {
      // 409 : un collègue a été plus rapide (le nom arrivera avec VIGIE-8)
      setErreur(err.status === 409 ? 'Déjà pris en charge par un collègue.' : err.message);
      setEnCours(false);
    }
  }

  return (
    <div className={styles.toast} role={critique ? 'alert' : 'status'}>
      <Ticket className={styles.icone} size={22} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
      <div className={styles.corps}>
        <span className={styles.direct}>
          <span className={styles.point} aria-hidden="true" />
          En direct · à l’instant
        </span>
        <span className={styles.titre}>
          Nouveau ticket · {LIBELLES_PRIORITE[ticket.prioriteFinale]} · {ticket.service?.nom}
        </span>
        <span className={`${styles.texte} chiffres`}>
          {ticket.reference} · {ticket.titre}
        </span>
        {erreur && <span className={styles.erreur}>{erreur}</span>}
        <div className={styles.actions}>
          <Button variante="tertiaire" taille="sm" onClick={ouvrir}>
            Ouvrir
          </Button>
          {!erreur && (
            <Button
              taille="sm"
              chargement={enCours && 'Prise en charge…'}
              onClick={prendreEnCharge}
            >
              Prendre en charge
            </Button>
          )}
        </div>
      </div>
      <button
        type="button"
        className={styles.fermer}
        aria-label="Fermer"
        onClick={() => fermerToast(notification._id)}
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
