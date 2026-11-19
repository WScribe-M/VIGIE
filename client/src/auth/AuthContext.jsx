import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { appelerApi, jetonStocke } from '../api.js';

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
