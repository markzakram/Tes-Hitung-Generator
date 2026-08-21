/**
 * Pembuat opsi pengecoh.
 *
 * Pengecoh diambil dari kesalahan yang benar-benar sering terjadi pada tes
 * hitung cepat (mengabaikan prioritas operasi, mengabaikan tanda kurung,
 * salah satu langkah meleset), bukan angka acak.
 *
 * Posisi kunci ditentukan LEBIH DAHULU oleh pemanggil, lalu pengecoh dibagi
 * ke sisi bawah dan atas jawaban sesuai posisi itu. Tanpa ini, opsi yang
 * diurutkan menaik akan membuat jawaban benar hampir selalu mendarat di
 * tengah (C), karena pengecoh terbentuk simetris di sekitar jawaban.
 */

import { render, type Node } from './expr';
import { decimals, fmt, r6 } from './num';
import { hitungTeks } from './parser';
import type { Rng } from './rng';

const HURUF = ['A', 'B', 'C', 'D', 'E', 'F'];

/** Hitung dari kiri ke kanan tanpa memedulikan prioritas & tanda kurung. */
function kiriKeKanan(teks: string): number {
  const bersih = teks.replace(/[()]/g, '');
  const tok = bersih.match(/[0-9][0-9.,]*|[+\-×÷:]/g);
  if (!tok || tok.length < 3) return NaN;
  const angka = (s: string) => Number(s.replace(/\./g, '').replace(',', '.'));
  let v = angka(tok[0]);
  for (let i = 1; i < tok.length - 1; i += 2) {
    const o = tok[i];
    const n = angka(tok[i + 1]);
    if (!Number.isFinite(n)) return NaN;
    if (o === '+') v += n;
    else if (o === '-') v -= n;
    else if (o === '×') v *= n;
    else if (o === '÷' || o === ':') { if (n === 0) return NaN; v /= n; }
    else return NaN;
  }
  return r6(v);
}

/** Hitung dengan prioritas operasi normal tetapi tanda kurung diabaikan. */
function abaikanKurung(teks: string): number {
  if (!teks.includes('(')) return NaN;
  try {
    return hitungTeks(teks.replace(/[()]/g, ''));
  } catch {
    return NaN;
  }
}

function layak(v: number, jawaban: number, maxDp: number): boolean {
  if (!Number.isFinite(v)) return false;
  if (r6(v) === r6(jawaban)) return false;
  if (v <= 0) return false;
  if (decimals(v) > maxDp) return false;
  const batas = Math.max(60, Math.abs(jawaban) * 4);
  return Math.abs(v) <= batas;
}

export type HasilOpsi = { opsi: string[]; kunci: string; nilaiOpsi: number[] };

export function buatOpsi(
  node: Node,
  jawaban: number,
  rnd: Rng,
  jumlahOpsi: number,
  urutkan: boolean,
  /** posisi kunci yang diinginkan: 0 = A, 1 = B, ... */
  posisiTarget: number,
): HasilOpsi {
  const teks = render(node);
  const maxDp = decimals(jawaban) > 0 ? 1 : 0;
  const langkah = maxDp === 1 ? 0.1 : 1;
  const perluPengecoh = jumlahOpsi - 1;

  const pakai = new Set<number>([r6(jawaban)]);
  // 'khas' = pengecoh dari kesalahan hitung yang khas, selalu diprioritaskan
  const khasBawah: number[] = [];
  const khasAtas: number[] = [];
  const bawah: number[] = [];
  const atas: number[] = [];

  const bulatkan = (v: number) => r6(Math.round(v / langkah) * langkah);

  const tambah = (v: number, khas = false) => {
    // Pengecoh dari kesalahan hitung tidak boleh dibulatkan: kalau salah
    // hitungnya menghasilkan 1,83 sementara opsi lain bilangan bulat, tidak
    // ada peserta yang akan menulis "2" - jadi angka itu memang bukan pengecoh.
    if (khas && decimals(v) > maxDp) return;
    const x = khas ? r6(v) : bulatkan(v);
    if (!layak(x, jawaban, maxDp) || pakai.has(x)) return;
    pakai.add(x);
    if (x < jawaban) (khas ? khasBawah : bawah).push(x);
    else (khas ? khasAtas : atas).push(x);
  };

  // 1. kesalahan khas urutan hitung - pengecoh paling bernilai
  tambah(kiriKeKanan(teks), true);
  tambah(abaikanKurung(teks), true);

  // 2. meleset tipis, lalu meleset sebesar beberapa persen jawaban
  const persen = Math.max(langkah, bulatkan(Math.abs(jawaban) * 0.06));
  const beda = [
    ...new Set(
      [
        langkah,
        2 * langkah,
        3 * langkah,
        4 * langkah,
        5 * langkah,
        8 * langkah,
        10 * langkah,
        persen,
        2 * persen,
        3 * persen,
        4 * persen,
      ]
        .map(r6)
        .filter((d) => d > 0),
    ),
  ];
  for (const d of beda) {
    tambah(jawaban - d);
    tambah(jawaban + d);
  }

  // 3. cadangan: sebar lebih lebar kalau salah satu sisi masih kurang
  let guard = 0;
  while (
    (bawah.length + khasBawah.length < perluPengecoh ||
      atas.length + khasAtas.length < perluPengecoh) &&
    guard++ < 300
  ) {
    const span = Math.max(6 * langkah, Math.abs(jawaban) * 0.4);
    tambah(jawaban + (rnd.next() * 2 - 1) * span);
  }

  /**
   * Ambil `n` pengecoh dari satu sisi: kesalahan khas lebih dulu, sisanya
   * dari yang paling dekat ke jawaban. Pemilihan diacak di antara beberapa
   * kandidat terdekat supaya jarak antaropsi tidak selalu berpola sama.
   */
  const ambil = (khas: number[], lain: number[], n: number) => {
    const hasil = khas.slice(0, n);
    const sisa = lain.slice().sort((a, b) => Math.abs(a - jawaban) - Math.abs(b - jawaban));
    while (hasil.length < n && sisa.length) {
      hasil.push(...sisa.splice(rnd.int(0, Math.min(sisa.length, 3) - 1), 1));
    }
    return hasil;
  };

  // bagi pengecoh sesuai posisi kunci yang diminta; kalau satu sisi tidak
  // cukup (jawaban kecil, pengecoh harus tetap positif), kekurangannya
  // digeser ke sisi lain dan posisi kunci ikut bergeser
  const adaBawah = khasBawah.length + bawah.length;
  const adaAtas = khasAtas.length + atas.length;
  let nBawah = Math.min(posisiTarget, adaBawah);
  let nAtas = Math.min(perluPengecoh - nBawah, adaAtas);
  if (nBawah + nAtas < perluPengecoh) nBawah = Math.min(adaBawah, perluPengecoh - nAtas);

  const pilihBawah = ambil(khasBawah, bawah, nBawah).sort((a, b) => a - b);
  const pilihAtas = ambil(khasAtas, atas, nAtas).sort((a, b) => a - b);

  let nilai: number[];
  let idx: number;

  if (urutkan) {
    nilai = [...pilihBawah, r6(jawaban), ...pilihAtas];
    idx = pilihBawah.length;
  } else {
    const lain = rnd.shuffle([...pilihBawah, ...pilihAtas]);
    idx = Math.min(posisiTarget, lain.length);
    nilai = [...lain.slice(0, idx), r6(jawaban), ...lain.slice(idx)];
  }

  return {
    opsi: nilai.map((v) => fmt(v)),
    kunci: HURUF[idx] ?? 'A',
    nilaiOpsi: nilai,
  };
}

/**
 * Rencana posisi kunci untuk satu paket: tiap huruf muncul sama banyak,
 * diacak, lalu dirapikan agar tidak ada tiga kunci sama berturut-turut.
 */
export function rencanaPosisiKunci(rnd: Rng, jumlahSoal: number, jumlahOpsi: number): number[] {
  const dasar = Array.from({ length: jumlahSoal }, (_, i) => i % jumlahOpsi);
  const p = rnd.shuffle(dasar);
  for (let i = 2; i < p.length; i++) {
    if (p[i] === p[i - 1] && p[i] === p[i - 2]) {
      const j = p.findIndex((v, k) => k > i && v !== p[i]);
      if (j > i) [p[i], p[j]] = [p[j], p[i]];
    }
  }
  return p;
}

export { HURUF };
