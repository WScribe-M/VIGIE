import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Figtree, famille unique du produit, servie en local : l'application marche sans Internet
import '@fontsource/figtree/400.css';
import '@fontsource/figtree/500.css';
import '@fontsource/figtree/600.css';
import '@fontsource/figtree/700.css';
// Design system : tokens d'abord, puis styles globaux et typographie
import './styles/tokens.css';
import './styles/base.css';
import './styles/typographie.css';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
