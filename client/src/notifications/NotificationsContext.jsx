import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { appelerApi } from '../api.js';
import { socket } from '../tempsReel/socket.js';
import { jouerSonAlerte } from './son.js';

// Notifications de l'utilisateur connecté (VIGIE-11), partagées par la cloche, son panneau et
// les toasts. L'API est la source de vérité : on la relit à l'ouverture de l'application et à
// chaque reconnexion Socket.io ; entre les deux, Socket.io ajoute les nouvelles en direct.

const NotificationsContext = createContext(null);

// 3 toasts au plus à l'écran (docs/ecrans/composants.md, Toast)
const TOASTS_MAX = 3;

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [nonLues, setNonLues] = useState(0);
  const [toasts, setToasts] = useState([]);

  const recharger = useCallback(() => {
    appelerApi('/notifications')
      .then((reponse) => {
        setNotifications(reponse.notifications);
        setNonLues(reponse.nonLues);
      })
      .catch(() => {}); // la cloche garde son dernier état ; nouvel essai à la reconnexion
  }, []);

  useEffect(() => {
    recharger();
    const surNouvelle = (notification) => {
      setNotifications((liste) => [notification, ...liste]);
      setNonLues((nombre) => nombre + 1);
      if (notification.type === 'NOUVEAU_TICKET') {
        jouerSonAlerte();
        setToasts((liste) => [notification, ...liste].slice(0, TOASTS_MAX));
      }
    };
    socket.on('connect', recharger);
    socket.on('notification:nouvelle', surNouvelle);
    return () => {
      socket.off('connect', recharger);
      socket.off('notification:nouvelle', surNouvelle);
    };
  }, [recharger]);

  // Le « lu » passe par l'API REST ; le compteur renvoyé par le serveur fait foi
  const marquerLue = useCallback(async (id) => {
    const { nonLues: restantes } = await appelerApi(`/notifications/${id}/lu`, {
      methode: 'PATCH',
    });
    setNotifications((liste) => liste.map((n) => (n._id === id ? { ...n, lu: true } : n)));
    setNonLues(restantes);
  }, []);

  const toutMarquerLu = useCallback(async () => {
    await appelerApi('/notifications/lues', { methode: 'PATCH' });
    setNotifications((liste) => liste.map((n) => ({ ...n, lu: true })));
    setNonLues(0);
  }, []);

  const fermerToast = useCallback((id) => {
    setToasts((liste) => liste.filter((toast) => toast._id !== id));
  }, []);

  const valeur = useMemo(
    () => ({ notifications, nonLues, toasts, marquerLue, toutMarquerLu, fermerToast }),
    [notifications, nonLues, toasts, marquerLue, toutMarquerLu, fermerToast],
  );
  return <NotificationsContext.Provider value={valeur}>{children}</NotificationsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications() {
  return useContext(NotificationsContext);
}
