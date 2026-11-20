import { Outlet } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import { MENU_PAR_ROLE } from '../auth/roles.js';
import { Sidebar } from './Sidebar.jsx';

// Les entrées du menu restent celles de roles.js : chaque page ajoute la sienne avec sa story
export function MiseEnPage() {
  const { utilisateur, deconnexion } = useAuth();

  return (
    <div className="mise-en-page">
      <div className="mise-en-page__barre">
        <Sidebar
          entrees={MENU_PAR_ROLE[utilisateur.role]}
          utilisateur={utilisateur}
          onDeconnexion={deconnexion}
        />
      </div>
      <main className="mise-en-page__contenu">
        <Outlet />
      </main>
    </div>
  );
}
