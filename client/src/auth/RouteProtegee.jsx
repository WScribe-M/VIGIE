import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './AuthContext.jsx';
import { accueilDuRole } from './roles.js';

// Redirige vers la connexion si besoin, et vers l'accueil du rôle si la page ne lui est pas destinée
export function RouteProtegee({ roles }) {
  const { utilisateur, chargement } = useAuth();
  const location = useLocation();

  if (chargement) return <p>Chargement…</p>;
  if (!utilisateur) {
    return <Navigate to="/connexion" replace state={{ depuis: location.pathname }} />;
  }
  if (roles && !roles.includes(utilisateur.role)) {
    return <Navigate to={accueilDuRole(utilisateur.role)} replace />;
  }
  return <Outlet />;
}
