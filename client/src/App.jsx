import { useEffect, useState } from 'react';

function App() {
  const [api, setApi] = useState({ etat: 'chargement' });

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setApi({ etat: 'ok', ...data }))
      .catch(() => setApi({ etat: 'erreur' }));
  }, []);

  return (
    <main>
      <h1>VIGIE</h1>
      <p>Application de gestion d’incidents IT.</p>
      <p>
        API : {api.etat === 'chargement' && 'connexion…'}
        {api.etat === 'erreur' && 'injoignable'}
        {api.etat === 'ok' && `${api.status} (base de données : ${api.database})`}
      </p>
    </main>
  );
}

export default App;
