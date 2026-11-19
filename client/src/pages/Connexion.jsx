import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import { accueilDuRole } from '../auth/roles.js';

export function Connexion() {
  const { utilisateur, connexion } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  if (utilisateur) return <Navigate to={accueilDuRole(utilisateur.role)} replace />;

  async function soumettre(event) {
    event.preventDefault();
    setErreur('');
    setEnvoi(true);
    try {
      const connecte = await connexion(email, motDePasse);
      navigate(location.state?.depuis ?? accueilDuRole(connecte.role), { replace: true });
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <main className="connexion">
      <h1>VIGIE</h1>
      <p>Gestion des incidents IT</p>
      <form onSubmit={soumettre}>
        <label>
          E-mail
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            autoComplete="current-password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            required
          />
        </label>
        {erreur && (
          <p className="erreur" role="alert">
            {erreur}
          </p>
        )}
        <button type="submit" disabled={envoi}>
          {envoi ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </main>
  );
}
