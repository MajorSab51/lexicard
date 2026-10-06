/** Générateur pseudo-aléatoire déterministe pour des mélanges reproductibles. */
export function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}
