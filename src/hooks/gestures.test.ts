import { classifyGesture } from './gestures';

describe('classifyGesture', () => {
  it('reconnaît un appui bref sans déplacement', () => {
    expect(classifyGesture(2, -3, 120)).toBe('tap');
    expect(classifyGesture(2, 3, 900)).toBe('none');
  });

  it('reconnaît un balayage horizontal franc dans les deux sens', () => {
    expect(classifyGesture(-90, 10, 200)).toBe('swipe-left');
    expect(classifyGesture(120, -20, 300)).toBe('swipe-right');
  });

  it('ignore un mouvement trop court ou trop vertical (défilement)', () => {
    expect(classifyGesture(-40, 0, 200)).toBe('none');
    expect(classifyGesture(-80, 70, 200)).toBe('none');
  });
});
