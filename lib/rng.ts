/**
 * RNG deterministik (mulberry32) + hash string.
 * Seed yang sama => paket soal yang sama persis, sehingga hasil generate
 * bisa direproduksi ulang kapan saja.
 */

export type Rng = {
  /** float [0,1) */
  next: () => number;
  /** integer di [min, max] inklusif */
  int: (min: number, max: number) => number;
  /** pilih 1 elemen acak */
  pick: <T>(arr: readonly T[]) => T;
  /** true dengan peluang p */
  chance: (p: number) => boolean;
  /** salinan array yang sudah diacak (Fisher-Yates) */
  shuffle: <T>(arr: readonly T[]) => T[];
};

export function hashSeed(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function createRng(seed: string | number): Rng {
  let a = (typeof seed === 'number' ? seed >>> 0 : hashSeed(seed)) || 0x9e3779b9;

  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number) => {
    if (max < min) [min, max] = [max, min];
    return min + Math.floor(next() * (max - min + 1));
  };

  const pick = <T,>(arr: readonly T[]): T => arr[int(0, arr.length - 1)];

  const chance = (p: number) => next() < p;

  const shuffle = <T,>(arr: readonly T[]): T[] => {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(0, i);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  return { next, int, pick, chance, shuffle };
}
