import { installSpeechMock, mockVoice } from '@/test/speechMock';
import { isSpeechSupported, loadVoices, speak } from './speech';

describe('synthèse vocale', () => {
  let mock: ReturnType<typeof installSpeechMock> | null = null;
  afterEach(() => {
    mock?.uninstall();
    mock = null;
    vi.useRealTimers();
  });

  it('détecte l’absence de synthèse vocale', async () => {
    expect(isSpeechSupported()).toBe(false);
    expect(await loadVoices()).toEqual([]);
    expect(await speak('hello', { lang: 'en', voice: null, rate: 1 })).toBe('error');
  });

  it('renvoie les voix disponibles immédiatement', async () => {
    mock = installSpeechMock({ voices: [mockVoice('Hazel', 'en-GB')] });
    expect(isSpeechSupported()).toBe(true);
    expect((await loadVoices()).map((voice) => voice.name)).toEqual(['Hazel']);
  });

  it('attend les voix chargées tardivement, avec un délai maximal', async () => {
    vi.useFakeTimers();
    mock = installSpeechMock();
    const late = loadVoices(1000);
    mock.setVoices([mockVoice('Helena', 'es-ES')]);
    expect((await late).map((voice) => voice.name)).toEqual(['Helena']);

    mock.setVoices([]);
    const never = loadVoices(1000);
    vi.advanceTimersByTime(1000);
    expect(await never).toEqual([]);
  });

  it('prononce avec la voix, la langue et la vitesse demandées', async () => {
    const hazel = mockVoice('Hazel', 'en-GB');
    mock = installSpeechMock({ voices: [hazel] });
    const outcome = await speak('apple', {
      lang: 'en',
      voice: hazel,
      rate: 0.8,
    });
    expect(outcome).toBe('ended');
    expect(mock.synth.cancel).toHaveBeenCalled();
    expect(mock.spoken[0]).toMatchObject({ text: 'apple', lang: 'en-GB', rate: 0.8, voice: hazel });
  });

  it('distingue une interruption d’une vraie erreur', async () => {
    mock = installSpeechMock({ failWith: 'interrupted' });
    expect(await speak('a', { lang: 'en', voice: null, rate: 1 })).toBe('interrupted');
    mock.uninstall();
    mock = installSpeechMock({ failWith: 'synthesis-failed' });
    expect(await speak('a', { lang: 'en', voice: null, rate: 1 })).toBe('error');
    expect(mock.spoken[0]?.lang).toBe('en');
  });
});
