import { Bell, Ticket } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useNotifications } from '../notifications/NotificationsContext.jsx';
import { TRAIT_ICONE } from '../styles/icones.js';
import { LIBELLES_PRIORITE } from '../styles/libelles.js';
import { formaterDateHeure } from '../utils/dates.js';
import styles from './NotificationBell.module.css';

// Titre affiché pour chaque type ; les autres types arriveront avec leurs stories
const TITRES = { NOUVEAU_TICKET: 'Nouveau ticket' };

function Ligne({ notification, onOuvrir }) {
  const { ticket } = notification;
  return (
    <li>
      <button
        type="button"
        className={`${styles.ligne} ${notification.lu ? '' : styles.nonLue}`}
        onClick={() => onOuvrir(notification)}
      >
        <span className={styles.point} aria-hidden="true" />
        <Ticket size={18} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
        <span className={styles.texte}>
          <strong>{TITRES[notification.type] ?? 'Notification'}</strong>
          {ticket && (
            <>
              {' '}
              {ticket.reference} · {ticket.titre} · {LIBELLES_PRIORITE[ticket.prioriteFinale]}
            </>
          )}
          {!notification.lu && <span className="visuellement-cache"> (non lue)</span>}
          <span className={`${styles.date} chiffres`}>{formaterDateHeure(notification.date)}</span>
        </span>
      </button>
    </li>
  );
}

/**
 * Cloche de l'en-tête et panneau des notifications (docs/ecrans/11-notifications.md).
 * Badge Pétrole, jamais rouge, plafonné à « 99+ ». Un clic sur une notification la marque lue
 * et ouvre le ticket. Filtres par type et page « toutes les notifications » : plus tard.
 */
export function NotificationBell() {
  const { notifications, nonLues, marquerLue, toutMarquerLu } = useNotifications();
  const navigate = useNavigate();
  const [ouvert, setOuvert] = useState(false);
  const [onglet, setOnglet] = useState('nonLues');
  const refConteneur = useRef(null);

  // Fermeture au clic en dehors et avec Échap
  useEffect(() => {
    if (!ouvert) return;
    const fermerSiDehors = (event) => {
      if (!refConteneur.current?.contains(event.target)) setOuvert(false);
    };
    const fermerAvecEchap = (event) => event.key === 'Escape' && setOuvert(false);
    document.addEventListener('mousedown', fermerSiDehors);
    document.addEventListener('keydown', fermerAvecEchap);
    return () => {
      document.removeEventListener('mousedown', fermerSiDehors);
      document.removeEventListener('keydown', fermerAvecEchap);
    };
  }, [ouvert]);

  const affichees =
    onglet === 'nonLues' ? notifications.filter((notification) => !notification.lu) : notifications;

  async function ouvrir(notification) {
    setOuvert(false);
    if (!notification.lu) await marquerLue(notification._id).catch(() => {});
    if (notification.ticket) navigate(`/tickets/${notification.ticket._id}`);
  }

  return (
    <div className={styles.conteneur} ref={refConteneur}>
      <button
        type="button"
        className={`${styles.cloche} ${ouvert ? styles.ouverte : ''}`}
        aria-label={nonLues ? `Notifications, ${nonLues} non lues` : 'Notifications'}
        aria-expanded={ouvert}
        onClick={() => setOuvert(!ouvert)}
      >
        <Bell size={20} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
        {nonLues > 0 && (
          <span className={`${styles.badge} chiffres`} aria-hidden="true">
            {nonLues > 99 ? '99+' : nonLues}
          </span>
        )}
      </button>

      {ouvert && (
        <section className={styles.panneau} aria-label="Notifications">
          <div className={styles.entete}>
            <h2 className={styles.titre}>Notifications</h2>
            {nonLues > 0 && (
              <button type="button" className={styles.lien} onClick={toutMarquerLu}>
                Tout marquer comme lu
              </button>
            )}
          </div>
          <div className={styles.onglets} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={onglet === 'nonLues'}
              className={styles.onglet}
              onClick={() => setOnglet('nonLues')}
            >
              Non lues
              {nonLues > 0 && <span className={`${styles.compteur} chiffres`}>{nonLues}</span>}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={onglet === 'toutes'}
              className={styles.onglet}
              onClick={() => setOnglet('toutes')}
            >
              Toutes
            </button>
          </div>
          {affichees.length ? (
            <ul className={styles.liste}>
              {affichees.map((notification) => (
                <Ligne key={notification._id} notification={notification} onOuvrir={ouvrir} />
              ))}
            </ul>
          ) : (
            <div className={styles.vide}>
              <Bell size={28} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
              <p className={styles.videTitre}>Vous êtes à jour</p>
              <p className={styles.videTexte}>Aucune notification non lue.</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
