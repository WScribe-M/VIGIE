import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import { MENU_PAR_ROLE } from '../auth/roles.js';

export function MiseEnPage() {
  const { utilisateur, deconnexion } = useAuth();

  return (
    <>
      <header className="entete">
        <strong>VIGIE</strong>
        <nav>
          {MENU_PAR_ROLE[utilisateur.role].map((page) => (
            <NavLink key={page.chemin} to={page.chemin}>
              {page.libelle}
            </NavLink>
          ))}
        </nav>
        <span>
          {utilisateur.prenom} {utilisateur.nom} · {utilisateur.role}
        </span>
        <button type="button" onClick={deconnexion}>
          Se déconnecter
        </button>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
