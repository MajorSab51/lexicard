import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RegisterSWOptions } from 'virtual:pwa-register/react';
import { useToastStore } from '@/lib/toast';
import { UpdatePrompt } from './UpdatePrompt';

const sw = vi.hoisted(() => ({
  needRefresh: true,
  options: undefined as RegisterSWOptions | undefined,
  updateServiceWorker: vi.fn((_reload?: boolean) => Promise.resolve()),
}));

vi.mock('virtual:pwa-register/react', async () => {
  const { useState } = await import('react');
  return {
    useRegisterSW: (options?: RegisterSWOptions) => {
      sw.options = options;
      return {
        needRefresh: useState(sw.needRefresh),
        offlineReady: useState(false),
        updateServiceWorker: sw.updateServiceWorker,
      };
    },
  };
});

describe('mise à jour de l’application', () => {
  beforeEach(() => {
    sw.needRefresh = true;
    sw.updateServiceWorker.mockClear();
  });

  it('propose la nouvelle version et l’installe à la demande', async () => {
    const user = userEvent.setup();
    render(<UpdatePrompt />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Une nouvelle version de LexiCards est disponible.',
    );
    await user.click(screen.getByRole('button', { name: 'Mettre à jour' }));
    expect(sw.updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('peut être remise à plus tard', async () => {
    const user = userEvent.setup();
    render(<UpdatePrompt />);

    await user.click(screen.getByRole('button', { name: 'Plus tard' }));
    expect(screen.queryByRole('status')).toBeNull();
    expect(sw.updateServiceWorker).not.toHaveBeenCalled();
  });

  it('n’affiche rien sans nouvelle version, et annonce la mise en cache hors ligne', () => {
    sw.needRefresh = false;
    const { container } = render(<UpdatePrompt />);
    expect(container).toBeEmptyDOMElement();

    sw.options?.onOfflineReady?.();
    expect(useToastStore.getState().toasts.map((toast) => toast.message)).toEqual([
      'LexiCards est prête à fonctionner hors ligne.',
    ]);
  });
});
