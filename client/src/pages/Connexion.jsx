import { CircleAlert, Eye, EyeOff, RefreshCw, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { appelerApi, ErreurApi } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { accueilDuRole } from '../auth/roles.js';
import { Button, IconButton } from '../composants/Button.jsx';
import { TextField } from '../composants/Champs.jsx';
import { Logo } from '../composants/Logo.jsx';
import { TRAIT_ICONE } from '../styles/icones.js';
import styles from './Connexion.module.css';

// Écran de connexion (VIGIE-49, docs/ecrans/01-connexion.md). Le fonctionnement vient de VIGIE-2 :
// seul l'écran change. Écarts de la fiche respectés : ni « Mot de passe oublié ? », ni « Rester
// connecté », ni compteur de tentatives (aucune story) ; encart « En direct » masqué jusqu'à VIGIE-42.

// API injoignable : on réessaie tout seul, comme l'annonce le texte (« Nous réessayons automatiquement »)
const DELAI_NOUVEL_ESSAI = 10 * 1000;

// Erreur réseau (API arrêtée) ou serveur (5xx, proxy Vite sans API) : ce n'est pas une erreur de saisie
function estIndisponible(err) {
  return !(err instanceof ErreurApi) || err.status >= 500;
}

function Indisponible({ onReessayer }) {
  return (
    <div className={styles.indisponible} role="alert">
      <WifiOff className={styles.iconeIndisponible} size={32} strokeWidth={TRAIT_ICONE} />
      <h1 className={styles.titreIndisponible}>Vigie est momentanément injoignable</h1>
      <p className={styles.texteIndisponible}>
        En cas d’urgence, appelez le support au 4400. Nous réessayons automatiquement.
      </p>
      <div>
        <Button variante="secondaire" icone={RefreshCw} onClick={onReessayer}>
          Réessayer
        </Button>
      </div>
    </div>
  );
}

export function Connexion() {
  const { utilisateur, connexion } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);
  const [erreurs, setErreurs] = useState({});
  const [identifiantsRefuses, setIdentifiantsRefuses] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [indisponible, setIndisponible] = useState(false);

  // L'API répond-elle ? Les états ne changent que dans la réponse, jamais directement dans l'effet
  const verifierApi = useCallback(() => {
    appelerApi('/health')
      .then(() => setIndisponible(false))
      .catch(() => setIndisponible(true));
  }, []);
  useEffect(() => {
    verifierApi();
  }, [verifierApi]);
  useEffect(() => {
    if (!indisponible) return;
    const minuterie = setInterval(verifierApi, DELAI_NOUVEL_ESSAI);
    return () => clearInterval(minuterie);
  }, [indisponible, verifierApi]);

  if (utilisateur) return <Navigate to={accueilDuRole(utilisateur.role)} replace />;

  async function soumettre(event) {
    event.preventDefault();
    setIdentifiantsRefuses(false);
    const manquants = {};
    if (!email.trim()) manquants.email = 'Indiquez votre adresse e-mail.';
    if (!motDePasse) manquants.motDePasse = 'Indiquez votre mot de passe.';
    setErreurs(manquants);
    if (Object.keys(manquants).length) return;

    setEnvoi(true);
    try {
      const connecte = await connexion(email, motDePasse);
      navigate(location.state?.depuis ?? accueilDuRole(connecte.role), { replace: true });
    } catch (err) {
      if (estIndisponible(err)) {
        setIndisponible(true);
      } else {
        // Même message pour un e-mail inconnu ou un mauvais mot de passe : le serveur ne dit pas
        // lequel des deux est faux, l'écran non plus
        setIdentifiantsRefuses(true);
      }
    } finally {
      setEnvoi(false);
    }
  }

  const modifier = (setter, champ) => (event) => {
    setter(event.target.value);
    if (erreurs[champ]) setErreurs({ ...erreurs, [champ]: undefined });
    setIdentifiantsRefuses(false);
  };

  return (
    <div className={styles.page}>
      <section className={styles.panneau} aria-label="Présentation de Vigie">
        <Logo className={styles.logo} />
        <div className={styles.promesse}>
          <p className={styles.titrePromesse}>Un incident signalé une fois, suivi par tous.</p>
          <p className={styles.accroche}>
            Déclarez une panne en moins d’une minute, rejoignez celles déjà signalées et suivez leur
            avancement en direct.
          </p>
        </div>
        {/* Encart « En direct » (état des services) : masqué tant que VIGIE-42 n'est pas livrée */}
      </section>

      <main className={styles.colonne}>
        {indisponible ? (
          <Indisponible onReessayer={verifierApi} />
        ) : (
          <div className={styles.formulaire}>
            <div className={styles.entete}>
              <h1 className="text-display-lg">Connexion</h1>
              <p className={styles.sousTitre}>Utilisez votre compte de l’entreprise.</p>
            </div>

            <form className={styles.champs} onSubmit={soumettre} noValidate>
              {identifiantsRefuses && (
                <p className={styles.bandeau} role="alert">
                  <CircleAlert size={18} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
                  <strong>Adresse e-mail ou mot de passe incorrect.</strong>
                </p>
              )}
              <TextField
                libelle="Adresse e-mail professionnelle"
                type="email"
                grand
                autoComplete="username"
                value={email}
                onChange={modifier(setEmail, 'email')}
                disabled={envoi}
                erreur={erreurs.email}
              />
              <TextField
                libelle="Mot de passe"
                type={motDePasseVisible ? 'text' : 'password'}
                grand
                autoComplete="current-password"
                value={motDePasse}
                onChange={modifier(setMotDePasse, 'motDePasse')}
                disabled={envoi}
                erreur={
                  erreurs.motDePasse ??
                  (identifiantsRefuses ? 'Vérifiez la saisie (majuscules activées ?).' : undefined)
                }
                bouton={
                  <IconButton
                    icone={motDePasseVisible ? EyeOff : Eye}
                    libelle={
                      motDePasseVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
                    }
                    className={styles.oeil}
                    onClick={() => setMotDePasseVisible(!motDePasseVisible)}
                    disabled={envoi}
                  />
                }
              />
              <Button type="submit" className={styles.bouton} chargement={envoi && 'Connexion…'}>
                Se connecter
              </Button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
