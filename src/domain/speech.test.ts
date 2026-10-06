import {
  clampRate,
  normalizeLang,
  pickVoice,
  primaryLanguage,
  rankVoices,
  type VoiceLike,
} from './speech';

const voice = (name: string, lang: string, localService = true, isDefault = false): VoiceLike => ({
  voiceURI: name,
  name,
  lang,
  localService,
  default: isDefault,
});

const voices = [
  voice('Google US English', 'en-US', false),
  voice('Hazel', 'en-GB'),
  voice('Zira', 'en-US', true, true),
  voice('Helena', 'es-ES'),
  voice('Sabina', 'es-MX'),
  voice('Google Deutsch', 'de-DE', false),
  voice('Hortense', 'fr-FR'),
];
const names = (list: VoiceLike[]) => list.map((v) => v.name);

describe('étiquettes de langue', () => {
  it('normalise les formats rencontrés sur les navigateurs', () => {
    expect(normalizeLang('en_us')).toBe('en-US');
    expect(normalizeLang(' es-mx ')).toBe('es-MX');
    expect(normalizeLang('zz--')).toBe('zz--');
    expect(primaryLanguage('de_AT')).toBe('de');
  });
});

describe('rankVoices', () => {
  it('ne garde que les voix de la langue, voix locales d’abord', () => {
    expect(names(rankVoices(voices, 'en'))).toEqual(['Hazel', 'Zira', 'Google US English']);
  });

  it('privilégie la variante régionale demandée par le set', () => {
    expect(names(rankVoices(voices, 'en-US'))).toEqual(['Zira', 'Google US English', 'Hazel']);
    expect(names(rankVoices(voices, 'es-MX'))[0]).toBe('Sabina');
  });

  it('se rabat sur une voix en ligne s’il n’y a qu’elle', () => {
    expect(names(rankVoices(voices, 'de'))).toEqual(['Google Deutsch']);
  });
});

describe('pickVoice', () => {
  it('respecte le choix enregistré s’il correspond à la langue', () => {
    expect(pickVoice(voices, 'en', 'Zira')?.name).toBe('Zira');
  });

  it('ignore un choix enregistré qui n’existe plus ou ne parle pas la langue', () => {
    expect(pickVoice(voices, 'en', 'Voix disparue')?.name).toBe('Hazel');
    expect(pickVoice(voices, 'en', 'Helena')?.name).toBe('Hazel');
  });

  it('retourne null quand aucune voix ne parle la langue', () => {
    expect(pickVoice(voices, 'ja')).toBeNull();
    expect(pickVoice([], 'en')).toBeNull();
  });
});

describe('clampRate', () => {
  it('borne la vitesse entre 0,5 et 1,5 au dixième près', () => {
    expect(clampRate(0.1)).toBe(0.5);
    expect(clampRate(3)).toBe(1.5);
    expect(clampRate(1.23)).toBe(1.2);
    expect(clampRate(Number.NaN)).toBe(1);
  });
});
