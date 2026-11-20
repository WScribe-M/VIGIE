import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import { accueilDuRole } from '../auth/roles.js';
import { Button } from '../composants/Button.jsx';

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
      <h1 className="text-display-xl">vigie</h1>
      <p className="texte-secondaire">Un incident signalé une fois, suivi par tous.</p>
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
        <Button type="submit" chargement={envoi ? 'Connexion…' : undefined}>
          Se connecter
        </Button>
      </form>
    </main>
  );
}
