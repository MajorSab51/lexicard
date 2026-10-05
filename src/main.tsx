import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createHashRouter, RouterProvider } from 'react-router';
import { routes } from '@/app/routes';
import '@/styles/index.css';

// Routage par hash : l'application fonctionne sur n'importe quel hébergement statique,
// sans réécriture d'URL côté serveur.
const router = createHashRouter(routes);

const container = document.getElementById('root');
if (!container) throw new Error('Élément #root introuvable');

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
