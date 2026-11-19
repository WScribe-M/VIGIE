import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AuthProvider, useAuth } from './auth/AuthContext.jsx';
import { RouteProtegee } from './auth/RouteProtegee.jsx';
import { accueilDuRole } from './auth/roles.js';
import { MiseEnPage } from './composants/MiseEnPage.jsx';
import { Connexion } from './pages/Connexion.jsx';
import { PageAVenir } from './pages/PageAVenir.jsx';

// Catalogue des composants : chargé seulement en développement, absent du build de production
const Styleguide = import.meta.env.DEV
  ? lazy(() => import('./pages/Styleguide.jsx').then((module) => ({ default: module.Styleguide })))
  : null;

function Accueil() {
  const { utilisateur, chargement } = useAuth();
  if (chargement) return <p>Chargement…</p>;
  return <Navigate to={utilisateur ? accueilDuRole(utilisateur.role) : '/connexion'} replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/connexion" element={<Connexion />} />
          {Styleguide && (
            <Route
              path="/styleguide"
              element={
                <Suspense>
                  <Styleguide />
                </Suspense>
              }
            />
          )}

          {/* Pages réservées aux utilisateurs connectés, filtrées par rôle */}
          <Route element={<RouteProtegee />}>
            <Route element={<MiseEnPage />}>
              <Route element={<RouteProtegee roles={['CLIENT']} />}>
                <Route
                  path="/mes-demandes"
                  element={<PageAVenir titre="Mes demandes" story="VIGIE-18" />}
                />
              </Route>
              <Route element={<RouteProtegee roles={['GESTIONNAIRE']} />}>
                <Route path="/ma-file" element={<PageAVenir titre="Ma file" story="VIGIE-31" />} />
              </Route>
              <Route element={<RouteProtegee roles={['GESTIONNAIRE', 'LECTEUR', 'ADMIN']} />}>
                <Route
                  path="/pilotage"
                  element={<PageAVenir titre="Pilotage" story="VIGIE-32" />}
                />
              </Route>
              <Route element={<RouteProtegee roles={['ADMIN']} />}>
                <Route
                  path="/administration"
                  element={<PageAVenir titre="Administration" story="VIGIE-4, VIGIE-37" />}
                />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Accueil />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
