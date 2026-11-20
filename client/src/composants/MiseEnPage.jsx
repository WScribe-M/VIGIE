import { Outlet } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import { MENU_PAR_ROLE } from '../auth/roles.js';
import { NotificationsProvider } from '../notifications/NotificationsContext.jsx';
import { Sidebar } from './Sidebar.jsx';
import { Toasts } from './Toasts.jsx';

// Les entrées du menu restent celles de roles.js : chaque page ajoute la sienne avec sa story.
// Les notifications (cloche, toasts) sont partagées par toutes les pages connectées.
export function MiseEnPage() {
  const { utilisateur, deconnexion } = useAuth();

  return (
    <NotificationsProvider>
      <div className="mise-en-page">
        <div className="mise-en-page__barre">
          <Sidebar
            // Un rôle inconnu (ancien compte, faute de frappe) ne doit pas donner un écran blanc
            entrees={MENU_PAR_ROLE[utilisateur.role] ?? []}
            utilisateur={utilisateur}
            onDeconnexion={deconnexion}
          />
        </div>
        <main className="mise-en-page__contenu">
          <Outlet />
        </main>
      </div>
      <Toasts />
    </NotificationsProvider>
  );
}
