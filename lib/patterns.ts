/**
 * Pool pola soal per blok mapping.
 *
 * `canonical: true` = bentuk yang tertulis persis di dokumen mapping.
 * `canonical: false` = variasi setara (cerminan bentuk kanonik dengan jumlah
 * operasi & beban hitung sama). Mode ketat hanya memakai yang kanonik.
 *
 * Setiap builder boleh mengembalikan `null` bila undian angka tidak memenuhi
 * syarat; pemanggil akan mengundi ulang.
 */

import type { BlokId } from './mapping';
import { add, div, mul, num, sub, type Node } from './expr';
import { decIn, divisorsInRange, r6 } from './num';
import type { Rng } from './rng';

export type BuildOpts = {
  /** izinkan bilangan desimal pada blok yang memperbolehkan */
  desimal: boolean;
  /** peluang sebuah suku tambah/kurang menjadi desimal */
  pDesimal: number;
};

export type PatternDef = {
  id: string;
  blok: BlokId;
  /** label subkategori untuk penyebaran variasi & pelaporan */
  sub: string;
  /** bentuk simbolik, mis. "a x b + c" */
  bentuk: string;
  canonical: boolean;
  build: (rnd: Rng, o: BuildOpts) => Node | null;
};

/* ------------------------------------------------------------- utilitas */

const dec1 = (rnd: Rng, lo: number, hi: number) => decIn(lo, hi, rnd.int);

/** Suku tambah/kurang: bilangan bulat, atau desimal 1 angka di belakang koma. */
function term(rnd: Rng, o: BuildOpts, loInt: number, hiInt: number): number {
  if (!Number.isFinite(loInt) || !Number.isFinite(hiInt) || hiInt < loInt) return NaN;
  if (o.desimal && rnd.chance(o.pDesimal) && hiInt - loInt >= 2) {
    // pastikan benar-benar berkoma (,1 sampai ,9)
    return r6(rnd.int(loInt, hiInt - 1) + rnd.int(1, 9) / 10);
  }
  return rnd.int(loInt, hiInt);
}

/** Pasangan (pembagi, hasil) sehingga pembagian selalu habis. */
function bagiHabis(rnd: Rng, bLo: number, bHi: number, qLo: number, qHi: number, maxA = 999) {
  const b = rnd.int(bLo, bHi);
  const q = rnd.int(qLo, qHi);
  const a = b * q;
  if (a > maxA) return null;
  return { a, b, q };
}

/**
 * Pecah jumlah `s` menjadi dua suku bulat a + b yang cukup berimbang.
 * Pembagian 30:70 sampai 70:30 mencegah bentuk seperti (3 + 133) yang secara
 * visual berat dan tidak cocok untuk tes kecepatan.
 */
function pecah(rnd: Rng, s: number, minSuku = 3) {
  if (s < minSuku * 2) return null;
  const lo = Math.max(minSuku, Math.round(s * 0.3));
  const hi = Math.min(s - minSuku, Math.round(s * 0.7));
  if (hi < lo) return null;
  const a = rnd.int(lo, hi);
  return { a, b: s - a };
}

const ok = (...vals: number[]) => vals.every((v) => Number.isFinite(v));

/* -------------------------------------------- BLOK 1: Operasi Tunggal 1-5 */

const TUNGGAL: PatternDef[] = [
  {
    id: 'T-tambah-bulat',
    blok: 'tunggal-mudah',
    sub: 'Penjumlahan',
    bentuk: 'a + b (bulat)',
    canonical: true,
    build: (r) => {
      const a = r.int(105, 780);
      const b = r.int(110, Math.min(999 - a, 790));
      return b < 110 ? null : add(num(a), num(b));
    },
  },
  {
    id: 'T-tambah-desimal',
    blok: 'tunggal-mudah',
    sub: 'Penjumlahan',
    bentuk: 'a + b (desimal)',
    canonical: true,
    build: (r, o) => {
      if (!o.desimal) return null;
      const a = dec1(r, 10.1, 79.9);
      const b = dec1(r, 10.1, Math.max(10.1, r6(99.9 - a)));
      if (Number.isInteger(a) && Number.isInteger(b)) return null;
      return add(num(a), num(b));
    },
  },
  {
    id: 'T-kurang-bulat',
    blok: 'tunggal-mudah',
    sub: 'Pengurangan',
    bentuk: 'a - b (bulat)',
    canonical: true,
    build: (r) => {
      const a = r.int(320, 985);
      const b = r.int(105, a - 95);
      return sub(num(a), num(b));
    },
  },
  {
    id: 'T-kurang-desimal',
    blok: 'tunggal-mudah',
    sub: 'Pengurangan',
    bentuk: 'a - b (desimal)',
    canonical: true,
    build: (r, o) => {
      if (!o.desimal) return null;
      const a = dec1(r, 30.1, 99.9);
      const b = dec1(r, 10.1, r6(a - 8.1));
      if (b < 10) return null;
      if (Number.isInteger(a) && Number.isInteger(b)) return null;
      return sub(num(a), num(b));
    },
  },
  {
    id: 'T-kali-2x1',
    blok: 'tunggal-mudah',
    sub: 'Perkalian',
    bentuk: 'a × b',
    canonical: true,
    build: (r) => mul(num(r.int(12, 99)), num(r.int(3, 9))),
  },
  {
    id: 'T-kali-2x2',
    blok: 'tunggal-mudah',
    sub: 'Perkalian',
    bentuk: 'a × b',
    canonical: true,
    build: (r) => mul(num(r.int(12, 49)), num(r.int(11, 25))),
  },
  {
    id: 'T-bagi',
    blok: 'tunggal-mudah',
    sub: 'Pembagian',
    bentuk: 'a ÷ b',
    canonical: true,
    build: (r) => {
      const p = bagiHabis(r, 3, 25, 4, 48, 999);
      if (!p || p.q < 4) return null;
      return div(num(p.a), num(p.b));
    },
  },
];

/* --------------------------------------- BLOK 2: Operasi Campuran 6-10 */

const CAMPURAN_MUDAH: PatternDef[] = [
  {
    id: 'CM-tambah-kurang',
    blok: 'campuran-mudah',
    sub: 'Tambah-Kurang',
    bentuk: 'a + b - c',
    canonical: true,
    build: (r, o) => {
      const a = term(r, o, 45, 180);
      const b = term(r, o, 25, 120);
      const c = term(r, o, 15, Math.floor(a + b - 12));
      return ok(a, b, c) ? sub(add(num(a), num(b)), num(c)) : null;
    },
  },
  {
    id: 'CM-kurang-tambah',
    blok: 'campuran-mudah',
    sub: 'Tambah-Kurang',
    bentuk: 'a - b + c',
    canonical: true,
    build: (r, o) => {
      const a = term(r, o, 80, 260);
      const b = term(r, o, 25, Math.floor(a - 25));
      const c = term(r, o, 15, 120);
      return ok(a, b, c) ? add(sub(num(a), num(b)), num(c)) : null;
    },
  },
  {
    id: 'CM-kali-tambah',
    blok: 'campuran-mudah',
    sub: 'Kali-Tambah/Kurang',
    bentuk: 'a × b + c',
    canonical: true,
    build: (r, o) => {
      const a = r.int(6, 19);
      const b = r.int(3, 12);
      const c = term(r, o, 5, 99);
      return ok(c) ? add(mul(num(a), num(b)), num(c)) : null;
    },
  },
  {
    id: 'CM-kali-kurang',
    blok: 'campuran-mudah',
    sub: 'Kali-Tambah/Kurang',
    bentuk: 'a × b - c',
    canonical: true,
    build: (r, o) => {
      const a = r.int(6, 19);
      const b = r.int(3, 12);
      const c = term(r, o, 5, a * b - 5);
      return ok(c) ? sub(mul(num(a), num(b)), num(c)) : null;
    },
  },
  {
    id: 'CM-bagi-tambah',
    blok: 'campuran-mudah',
    sub: 'Bagi-Tambah/Kurang',
    bentuk: 'a ÷ b + c',
    canonical: true,
    build: (r, o) => {
      const p = bagiHabis(r, 3, 12, 4, 30, 360);
      if (!p) return null;
      const c = term(r, o, 5, 99);
      return ok(c) ? add(div(num(p.a), num(p.b)), num(c)) : null;
    },
  },
  {
    id: 'CM-bagi-kurang',
    blok: 'campuran-mudah',
    sub: 'Bagi-Tambah/Kurang',
    bentuk: 'a ÷ b - c',
    canonical: true,
    build: (r, o) => {
      const p = bagiHabis(r, 3, 12, 8, 40, 480);
      if (!p) return null;
      const c = term(r, o, 3, p.q - 3);
      return ok(c) ? sub(div(num(p.a), num(p.b)), num(c)) : null;
    },
  },
  {
    id: 'CM-kali-bagi',
    blok: 'campuran-mudah',
    sub: 'Kali-Bagi',
    bentuk: 'a × b ÷ c',
    canonical: true,
    build: (r) => {
      const a = r.int(4, 24);
      const b = r.int(3, 20);
      const P = a * b;
      // c tidak boleh sama dengan a atau b, supaya pembagian tidak sekadar
      // membatalkan perkalian (mis. 14 x 5 : 5) dan soal tetap ada isinya
      const kandidat = divisorsInRange(P, 2, 12).filter(
        (c) => c !== a && c !== b && P / c >= 4 && P / c <= 200,
      );
      if (!kandidat.length) return null;
      return div(mul(num(a), num(b)), num(r.pick(kandidat)));
    },
  },
];

/* ------------------------------------- BLOK 3: Operasi Campuran 11-15 */

const CAMPURAN_SEDANG: PatternDef[] = [
  {
    id: 'CS-tambah-kali-kurang',
    blok: 'campuran-sedang',
    sub: 'a + b × c - d',
    bentuk: 'a + b × c - d',
    canonical: true,
    build: (r, o) => {
      const b = r.int(4, 15);
      const c = r.int(3, 12);
      const a = term(r, o, 10, 90);
      const d = term(r, o, 5, Math.floor(a + b * c - 8));
      return ok(a, d) ? sub(add(num(a), mul(num(b), num(c))), num(d)) : null;
    },
  },
  {
    id: 'CS-kurang-kali-tambah',
    blok: 'campuran-sedang',
    sub: 'a - b × c + d',
    bentuk: 'a - b × c + d',
    canonical: true,
    build: (r, o) => {
      const b = r.int(3, 12);
      const c = r.int(3, 9);
      const P = b * c;
      const a = term(r, o, P + 5, P + 120);
      const d = term(r, o, 5, 90);
      return ok(a, d) ? add(sub(num(a), mul(num(b), num(c))), num(d)) : null;
    },
  },
  {
    id: 'CS-bagi-tambah-kali',
    blok: 'campuran-sedang',
    sub: 'a ÷ b + c × d',
    bentuk: 'a ÷ b + c × d',
    canonical: true,
    build: (r) => {
      const p = bagiHabis(r, 3, 12, 4, 30, 360);
      if (!p) return null;
      return add(div(num(p.a), num(p.b)), mul(num(r.int(3, 15)), num(r.int(3, 12))));
    },
  },
  {
    id: 'CS-kali-kurang-bagi',
    blok: 'campuran-sedang',
    sub: 'a × b - c ÷ d',
    bentuk: 'a × b - c ÷ d',
    canonical: true,
    build: (r) => {
      const a = r.int(5, 19);
      const b = r.int(3, 12);
      const P = a * b;
      const d = r.int(3, 12);
      const q = r.int(2, 20);
      if (q > P - 5) return null;
      return sub(mul(num(a), num(b)), div(num(d * q), num(d)));
    },
  },
  {
    id: 'CS-bagi-kali-tambah',
    blok: 'campuran-sedang',
    sub: 'a ÷ b × c + d',
    bentuk: 'a ÷ b × c + d',
    canonical: true,
    build: (r, o) => {
      const p = bagiHabis(r, 3, 12, 3, 20, 240);
      if (!p) return null;
      const c = r.int(2, 9);
      if (p.q * c > 300) return null;
      const d = term(r, o, 5, 90);
      return ok(d) ? add(mul(div(num(p.a), num(p.b)), num(c)), num(d)) : null;
    },
  },
  {
    id: 'CS-kali-tambah-kurang',
    blok: 'campuran-sedang',
    sub: 'a × b + c - d',
    bentuk: 'a × b + c - d',
    canonical: false,
    build: (r, o) => {
      const a = r.int(5, 19);
      const b = r.int(3, 12);
      const c = term(r, o, 5, 90);
      const d = term(r, o, 5, Math.floor(a * b + c - 8));
      return ok(c, d) ? sub(add(mul(num(a), num(b)), num(c)), num(d)) : null;
    },
  },
  {
    id: 'CS-kurang-bagi-tambah',
    blok: 'campuran-sedang',
    sub: 'a - b ÷ c + d',
    bentuk: 'a - b ÷ c + d',
    canonical: false,
    build: (r, o) => {
      const p = bagiHabis(r, 3, 12, 3, 25, 300);
      if (!p) return null;
      const a = term(r, o, p.q + 5, p.q + 120);
      const d = term(r, o, 5, 90);
      return ok(a, d) ? add(sub(num(a), div(num(p.a), num(p.b))), num(d)) : null;
    },
  },
  {
    id: 'CS-tambah-bagi-kurang',
    blok: 'campuran-sedang',
    sub: 'a + b ÷ c - d',
    bentuk: 'a + b ÷ c - d',
    canonical: false,
    build: (r, o) => {
      const p = bagiHabis(r, 3, 12, 3, 25, 300);
      if (!p) return null;
      const a = term(r, o, 10, 90);
      const d = term(r, o, 5, Math.floor(a + p.q - 5));
      return ok(a, d) ? sub(add(num(a), div(num(p.a), num(p.b))), num(d)) : null;
    },
  },
];

/* ---------------------------------- BLOK 4: Operasi Bertingkat 16-20 */

const BERTINGKAT_SEDANG: PatternDef[] = [
  {
    id: 'BS-kurung-kali',
    blok: 'bertingkat-sedang',
    sub: '(a + b) × c',
    bentuk: '(a + b) × c',
    canonical: true,
    build: (r) => {
      const a = r.int(6, 40);
      const b = r.int(4, 35);
      if (a + b > 60) return null;
      const c = r.int(3, 12);
      if ((a + b) * c > 720) return null;
      return mul(add(num(a), num(b)), num(c));
    },
  },
  {
    id: 'BS-kali-kurung-kurang',
    blok: 'bertingkat-sedang',
    sub: 'a × (b - c)',
    bentuk: 'a × (b - c)',
    canonical: true,
    build: (r) => {
      const a = r.int(3, 15);
      const b = r.int(12, 45);
      const c = r.int(3, b - 4);
      if (b - c > 40 || a * (b - c) > 500) return null;
      return mul(num(a), sub(num(b), num(c)));
    },
  },
  {
    id: 'BS-bagi-kurung-kurang',
    blok: 'bertingkat-sedang',
    sub: 'a ÷ (b - c)',
    bentuk: 'a ÷ (b - c)',
    canonical: true,
    build: (r) => {
      const d = r.int(3, 15);
      const q = r.int(4, 30);
      const a = d * q;
      if (a > 480) return null;
      const b = r.int(d + 3, d + 40);
      return div(num(a), sub(num(b), num(b - d)));
    },
  },
  {
    id: 'BS-kurung-bagi-tambah',
    blok: 'bertingkat-sedang',
    sub: '(a + b) ÷ c + d',
    bentuk: '(a + b) ÷ c + d',
    canonical: true,
    build: (r) => {
      const c = r.int(3, 12);
      const q = r.int(4, 25);
      const s = c * q;
      if (s > 180) return null;
      const p = pecah(r, s, 5);
      if (!p) return null;
      return add(div(add(num(p.a), num(p.b)), num(c)), num(r.int(5, 90)));
    },
  },
  {
    id: 'BS-kurung-kurang-kali',
    blok: 'bertingkat-sedang',
    sub: '(a - b) × c',
    bentuk: '(a - b) × c',
    canonical: false,
    build: (r) => {
      const a = r.int(20, 60);
      const b = r.int(5, a - 6);
      if (a - b > 45) return null;
      const c = r.int(3, 12);
      if ((a - b) * c > 600) return null;
      return mul(sub(num(a), num(b)), num(c));
    },
  },
  {
    id: 'BS-kali-kurung-tambah',
    blok: 'bertingkat-sedang',
    sub: 'a × (b + c)',
    bentuk: 'a × (b + c)',
    canonical: false,
    build: (r) => {
      const a = r.int(3, 15);
      const b = r.int(5, 30);
      const c = r.int(4, 25);
      if (b + c > 50 || a * (b + c) > 520) return null;
      return mul(num(a), add(num(b), num(c)));
    },
  },
  {
    id: 'BS-kurung-bagi',
    blok: 'bertingkat-sedang',
    sub: '(a + b) ÷ c',
    bentuk: '(a + b) ÷ c',
    canonical: false,
    build: (r) => {
      const c = r.int(3, 15);
      const q = r.int(4, 40);
      const s = c * q;
      if (s > 240) return null;
      const p = pecah(r, s, 5);
      return p ? div(add(num(p.a), num(p.b)), num(c)) : null;
    },
  },
  {
    id: 'BS-bagi-kurung-tambah',
    blok: 'bertingkat-sedang',
    sub: 'a ÷ (b + c)',
    bentuk: 'a ÷ (b + c)',
    canonical: false,
    build: (r) => {
      const s = r.int(4, 20);
      const q = r.int(4, 30);
      const a = s * q;
      if (a > 480) return null;
      const p = pecah(r, s, 2);
      return p ? div(num(a), add(num(p.a), num(p.b))) : null;
    },
  },
];

/* --------------------------------- BLOK 5: Operasi Bertingkat 21-25 */

const BERTINGKAT_MENANTANG: PatternDef[] = [
  {
    id: 'BM-kali-kurung-tambah',
    blok: 'bertingkat-menantang',
    sub: 'a × (b - c) + d',
    bentuk: 'a × (b - c) + d',
    canonical: true,
    build: (r) => {
      const a = r.int(3, 15);
      const b = r.int(10, 40);
      const c = r.int(3, b - 4);
      if (b - c > 32 || a * (b - c) > 400) return null;
      return add(mul(num(a), sub(num(b), num(c))), num(r.int(5, 120)));
    },
  },
  {
    id: 'BM-bagi-kurung-kali',
    blok: 'bertingkat-menantang',
    sub: 'a ÷ (b + c) × d',
    bentuk: 'a ÷ (b + c) × d',
    canonical: true,
    build: (r) => {
      const s = r.int(4, 18);
      const q = r.int(3, 25);
      const a = s * q;
      if (a > 450) return null;
      const d = r.int(2, 9);
      if (q * d > 400 || q * d < 24) return null;
      const p = pecah(r, s, 2);
      return p ? mul(div(num(a), add(num(p.a), num(p.b))), num(d)) : null;
    },
  },
  {
    id: 'BM-kurung-kali-kurang',
    blok: 'bertingkat-menantang',
    sub: '(a + b) × c - d',
    bentuk: '(a + b) × c - d',
    canonical: true,
    build: (r) => {
      const a = r.int(5, 35);
      const b = r.int(4, 30);
      if (a + b > 55) return null;
      const c = r.int(3, 12);
      const P = (a + b) * c;
      if (P > 600) return null;
      return sub(mul(add(num(a), num(b)), num(c)), num(r.int(5, P - 8)));
    },
  },
  {
    id: 'BM-bagi-tambah-kali-kurung',
    blok: 'bertingkat-menantang',
    sub: 'a ÷ b + c × (d - e)',
    bentuk: 'a ÷ b + c × (d - e)',
    canonical: true,
    build: (r) => {
      const p = bagiHabis(r, 3, 12, 3, 20, 240);
      if (!p) return null;
      const d = r.int(8, 30);
      const e = r.int(3, d - 3);
      const c = r.int(2, 9);
      if (d - e > 22 || c * (d - e) > 300) return null;
      return add(div(num(p.a), num(p.b)), mul(num(c), sub(num(d), num(e))));
    },
  },
  {
    id: 'BM-kali-kurung-kurang',
    blok: 'bertingkat-menantang',
    sub: 'a × (b + c) - d',
    bentuk: 'a × (b + c) - d',
    canonical: false,
    build: (r) => {
      const a = r.int(3, 12);
      const b = r.int(5, 25);
      const c = r.int(4, 20);
      if (b + c > 40) return null;
      const P = a * (b + c);
      if (P > 480) return null;
      return sub(mul(num(a), add(num(b), num(c))), num(r.int(5, P - 8)));
    },
  },
  {
    id: 'BM-kurung-kurang-kali-tambah',
    blok: 'bertingkat-menantang',
    sub: '(a - b) × c + d',
    bentuk: '(a - b) × c + d',
    canonical: false,
    build: (r) => {
      const a = r.int(15, 55);
      const b = r.int(4, a - 5);
      if (a - b > 40) return null;
      const c = r.int(3, 12);
      if ((a - b) * c > 480) return null;
      return add(mul(sub(num(a), num(b)), num(c)), num(r.int(5, 120)));
    },
  },
  {
    id: 'BM-bagi-kurung-kurang-kali',
    blok: 'bertingkat-menantang',
    sub: 'a ÷ (b - c) × d',
    bentuk: 'a ÷ (b - c) × d',
    canonical: false,
    build: (r) => {
      const diff = r.int(3, 15);
      const q = r.int(3, 25);
      const a = diff * q;
      if (a > 450) return null;
      const b = r.int(diff + 3, diff + 35);
      const d = r.int(2, 9);
      if (q * d > 400 || q * d < 24) return null;
      return mul(div(num(a), sub(num(b), num(b - diff))), num(d));
    },
  },
  {
    id: 'BM-kurung-bagi-kali',
    blok: 'bertingkat-menantang',
    sub: '(a + b) ÷ c × d',
    bentuk: '(a + b) ÷ c × d',
    canonical: false,
    build: (r) => {
      const c = r.int(3, 12);
      const q = r.int(3, 20);
      const s = c * q;
      if (s > 180) return null;
      const d = r.int(2, 9);
      if (q * d > 400 || q * d < 24) return null;
      const p = pecah(r, s, 5);
      return p ? mul(div(add(num(p.a), num(p.b)), num(c)), num(d)) : null;
    },
  },
];

export const SEMUA_POLA: readonly PatternDef[] = [
  ...TUNGGAL,
  ...CAMPURAN_MUDAH,
  ...CAMPURAN_SEDANG,
  ...BERTINGKAT_SEDANG,
  ...BERTINGKAT_MENANTANG,
];

/** Pool pola untuk sebuah blok. `ketat` membatasi ke bentuk kanonik mapping. */
export function poolBlok(blok: BlokId, ketat: boolean): PatternDef[] {
  return SEMUA_POLA.filter((p) => p.blok === blok && (!ketat || p.canonical));
}
