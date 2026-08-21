/**
 * Pembuat opsi pengecoh.
 *
 * Pengecoh diambil dari kesalahan yang benar-benar sering terjadi pada tes
 * hitung cepat (mengabaikan prioritas operasi, mengabaikan tanda kurung,
 * salah satu langkah meleset), bukan angka acak. Sisanya baru diisi angka
 * di sekitar jawaban.
 */

import { render, type Node } from './expr';
import { decimals, fmt, r6 } from './num';
import { hitungTeks } from './parser';
import type { Rng } from './rng';

const HURUF = ['A', 'B', 'C', 'D', 'E', 'F'];

/** Hitung dari kiri ke kanan tanpa memedulikan prioritas & tanda kurung. */
function kiriKeKanan(teks: string): number {
  const bersih = teks.replace(/[()]/g, '');
  const tok = bersih.match(/[0-9][0-9.,]*|[+\-×÷]/g);
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
    else if (o === '÷') { if (n === 0) return NaN; v /= n; }
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
): HasilOpsi {
  const teks = render(node);
  const maxDp = decimals(jawaban) > 0 ? 1 : 0;
  const terpakai = new Set<number>([r6(jawaban)]);
  const pengecoh: number[] = [];

  const tambah = (v: number) => {
    const x = r6(v);
    if (pengecoh.length >= jumlahOpsi - 1) return;
    if (!layak(x, jawaban, maxDp) || terpakai.has(x)) return;
    terpakai.add(x);
    pengecoh.push(x);
  };

  // 1. kesalahan khas: urutan hitung
  tambah(kiriKeKanan(teks));
  tambah(abaikanKurung(teks));

  // 2. meleset tipis di salah satu langkah
  const delta = maxDp === 1 ? [0.1, -0.1, 1, -1, 2, -2, 10, -10] : [1, -1, 2, -2, 5, -5, 10, -10];
  for (const d of rnd.shuffle(delta)) tambah(jawaban + d);

  // 3. salah satu digit / skala
  const skala = [jawaban * 2, jawaban / 2, jawaban + 20, jawaban - 20, jawaban * 10, jawaban / 10];
  for (const s of rnd.shuffle(skala)) tambah(maxDp === 1 ? r6(Math.round(s * 10) / 10) : Math.round(s));

  // 4. cadangan: angka acak di sekitar jawaban
  let guard = 0;
  while (pengecoh.length < jumlahOpsi - 1 && guard++ < 400) {
    const span = Math.max(6, Math.round(Math.abs(jawaban) * 0.35));
    const kandidat = jawaban + rnd.int(-span, span);
    tambah(maxDp === 1 ? r6(Math.round(kandidat * 10) / 10) : Math.round(kandidat));
  }

  const nilai = [r6(jawaban), ...pengecoh];
  const urut = urutkan ? nilai.slice().sort((a, b) => a - b) : rnd.shuffle(nilai);
  const idx = urut.findIndex((v) => v === r6(jawaban));

  return {
    opsi: urut.map((v) => fmt(v)),
    kunci: HURUF[idx] ?? 'A',
    nilaiOpsi: urut,
  };
}

export { HURUF };
