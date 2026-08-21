/**
 * Helper bilangan: pembulatan aman untuk floating point, cek kebersihan
 * angka (maksimal 1 angka di belakang koma), dan format gaya Indonesia
 * (koma desimal, titik ribuan).
 */

const EPS = 1e-9;

/** Bulatkan sisa galat floating point (mis. 0.1+0.2 -> 0.3). */
export function r6(x: number): number {
  return Math.round(x * 1e6) / 1e6;
}

export function isInt(x: number): boolean {
  return Math.abs(x - Math.round(x)) < EPS;
}

/** Jumlah angka di belakang koma (setelah dibersihkan). */
export function decimals(x: number): number {
  const v = r6(Math.abs(x));
  if (isInt(v)) return 0;
  if (Math.abs(v * 10 - Math.round(v * 10)) < EPS) return 1;
  if (Math.abs(v * 100 - Math.round(v * 100)) < EPS) return 2;
  return 3;
}

/** Angka "bersih" untuk tes hitung cepat: bulat atau tepat 1 desimal. */
export function isClean(x: number, maxDp = 1): boolean {
  return Number.isFinite(x) && decimals(x) <= maxDp;
}

/** Format 1234.5 -> "1.234,5" */
export function fmt(x: number): string {
  const v = r6(x);
  return v.toLocaleString('id-ID', { maximumFractionDigits: 2, useGrouping: true });
}

/** Format tanpa pemisah ribuan, untuk CSV/JSON: 1234.5 -> "1234,5" */
export function fmtPlain(x: number): string {
  const v = r6(x);
  return v.toLocaleString('id-ID', { maximumFractionDigits: 2, useGrouping: false });
}

/** Bilangan desimal 1 angka di belakang koma pada rentang tertentu. */
export function decIn(lo: number, hi: number, rndInt: (a: number, b: number) => number): number {
  return r6(rndInt(Math.round(lo * 10), Math.round(hi * 10)) / 10);
}

/** Semua pembagi n yang berada pada rentang [lo, hi]. */
export function divisorsInRange(n: number, lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let d = Math.max(1, lo); d <= Math.min(n, hi); d++) {
    if (n % d === 0) out.push(d);
  }
  return out;
}
