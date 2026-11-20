import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { appelerApi, ErreurApi, jetonStocke, tempsRestantJeton } from '../api.js';
import { reconnecterSocket, socket } from '../tempsReel/socket.js';

// Le jeton est renouvelé 5 minutes avant son expiration
const MARGE_RENOUVELLEMENT = 5 * 60 * 1000;
// En cas de panne réseau, on retente au bout de 30 secondes
const DELAI_NOUVEL_ESSAI = 30 * 1000;
// setTimeout n'accepte pas plus de 2^31 - 1 ms (environ 24 jours)
const DELAI_MAX = 2 ** 31 - 1;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(null);
  // Tant qu'on vérifie un jeton déjà stocké, on n'affiche pas encore la page
  const [chargement, setChargement] = useState(() => Boolean(jetonStocke.lire()));

  useEffect(() => {
    if (!jetonStocke.lire()) return;
    appelerApi('/auth/moi')
      .then(setUtilisateur)
      .catch(() => jetonStocke.effacer()) // jeton expiré ou compte désactivé
      .finally(() => setChargement(false));
  }, []);

  const connexion = useCallback(async (email, motDePasse) => {
    const { jeton, utilisateur } = await appelerApi('/auth/connexion', {
      methode: 'POST',
      corps: { email, motDePasse },
    });
    jetonStocke.ecrire(jeton);
    setUtilisateur(utilisateur);
    return utilisateur;
  }, []);

  const deconnexion = useCallback(() => {
    jetonStocke.effacer();
    setUtilisateur(null);
  }, []);

  // Temps réel : connecté tant qu'un utilisateur l'est
  useEffect(() => {
    if (!utilisateur) return;
    socket.connect();
    return () => socket.disconnect();
  }, [utilisateur]);

  // Renouvellement du jeton avant son expiration, pour ne couper ni la session ni le temps réel
  useEffect(() => {
    if (!utilisateur) return;
    let minuterie;

    const programmer = (delai) => {
      minuterie = setTimeout(renouveler, Math.min(Math.max(delai, 0), DELAI_MAX));
    };

    async function renouveler() {
      try {
        const { jeton } = await appelerApi('/auth/renouveler', { methode: 'POST' });
        jetonStocke.ecrire(jeton);
        reconnecterSocket();
        programmer(tempsRestantJeton(jeton) - MARGE_RENOUVELLEMENT);
      } catch (err) {
        // 401 : jeton expiré ou compte désactivé, la session est terminée
        if (err instanceof ErreurApi && err.status === 401) {
          deconnexion();
        } else {
          programmer(DELAI_NOUVEL_ESSAI);
        }
      }
    }

    programmer(tempsRestantJeton(jetonStocke.lire()) - MARGE_RENOUVELLEMENT);
    return () => clearTimeout(minuterie);
  }, [utilisateur, deconnexion]);

  const valeur = useMemo(
    () => ({ utilisateur, chargement, connexion, deconnexion }),
    [utilisateur, chargement, connexion, deconnexion],
  );
  return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
