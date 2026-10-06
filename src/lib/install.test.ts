import { listenForInstall, promptInstall, useInstallStore } from './install';

function installPrompt(outcome: 'accepted' | 'dismissed') {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  const prompt = vi.fn(() => Promise.resolve());
  Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome }) });
  return { event, prompt };
}

describe('installation de l’application', () => {
  let target: Window;
  beforeEach(() => {
    useInstallStore.setState({ deferred: null, installed: false });
    target = new EventTarget() as unknown as Window;
    listenForInstall(target);
  });

  it('met de côté la proposition du navigateur et l’ouvre à la demande', async () => {
    const { event, prompt } = installPrompt('accepted');
    target.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(useInstallStore.getState().deferred).toBe(event);

    await expect(promptInstall()).resolves.toBe(true);
    expect(prompt).toHaveBeenCalledOnce();
    // Une proposition ne sert qu'une fois.
    expect(useInstallStore.getState().deferred).toBeNull();
  });

  it('signale un refus', async () => {
    target.dispatchEvent(installPrompt('dismissed').event);
    await expect(promptInstall()).resolves.toBe(false);
  });

  it('ne fait rien sans proposition du navigateur', async () => {
    await expect(promptInstall()).resolves.toBe(false);
  });

  it('retient que l’application est installée', () => {
    target.dispatchEvent(installPrompt('accepted').event);
    target.dispatchEvent(new Event('appinstalled'));
    expect(useInstallStore.getState()).toEqual({ deferred: null, installed: true });
  });
});
