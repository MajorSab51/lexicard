import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '@/app/routes';

/** Rend l'application complète à une URL donnée, avec un routeur en mémoire. */
export function renderRoute(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const user = userEvent.setup();
  return { user, router, ...render(<RouterProvider router={router} />) };
}
