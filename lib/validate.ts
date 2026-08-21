/**
 * Validator kepatuhan mapping.
 *
 * Dipakai dua kali:
 *  1. saat generate, untuk menerima/menolak kandidat soal (`cekNode`);
 *  2. setelah generate, sebagai audit independen (`validasiPaket`) yang
 *     mem-parse ulang teks soal dari nol dan mencocokkan kunci jawaban.
 */

import {
  decimalPlacementOk,
  evaluate,
  hasParen,
  opCount,
  operands,
  render,
  type EvalRules,
  type Node,
} from './expr';
import { BLOK, DISTRIBUSI, JUMLAH_SOAL, blokUntukNomor, type Blok } from './mapping';
import { r6 } from './num';
import { hitungTeks } from './parser';
import type { OpsiGenerate, Paket, Soal } from './types';

export function aturanHitung(opsi: Pick<OpsiGenerate, 'hindariNegatif'>): EvalRules {
  return { maxDp: 1, noNegative: opsi.hindariNegatif, exactDivision: true, maxAbs: 9999 };
}

/** Cek satu kandidat soal terhadap batasan bloknya. Kosong = lolos. */
export function cekNode(node: Node, blok: Blok, opsi: Pick<OpsiGenerate, 'hindariNegatif'>): string[] {
  const err: string[] = [];
  const ops = opCount(node);

  if (ops < blok.minOps || ops > blok.maxOps) {
    err.push(`jumlah operasi ${ops}, seharusnya ${blok.minOps}-${blok.maxOps}`);
  }

  const kurung = hasParen(node);
  if (blok.kurung === 'wajib' && !kurung) err.push('blok ini wajib bertanda kurung');
  if (blok.kurung === 'larang' && kurung) err.push('blok ini tidak boleh bertanda kurung');

  const adaDesimal = operands(node).some((v) => !Number.isInteger(v));
  if (adaDesimal && !blok.izinDesimal) err.push('desimal tidak diizinkan pada blok ini');
  if (adaDesimal && !decimalPlacementOk(node)) {
    err.push('desimal hanya boleh sebagai suku tambah/kurang');
  }

  const hasil = evaluate(node, aturanHitung(opsi));
  if (!hasil.ok) err.push(hasil.reason ?? 'hasil tidak valid');

  return err;
}

export type TemuanValidasi = {
  paket: number;
  no: number | null;
  pesan: string;
};

export type LaporanValidasi = {
  lolos: boolean;
  totalSoal: number;
  totalPaket: number;
  temuan: TemuanValidasi[];
  /** jumlah soal yang teks-nya sama persis di seluruh paket */
  duplikatLintasPaket: number;
};

function cekSoal(s: Soal, opsi: OpsiGenerate, paketNo: number, temuan: TemuanValidasi[]) {
  const push = (pesan: string) => temuan.push({ paket: paketNo, no: s.no, pesan });
  const blok = blokUntukNomor(s.no);

  if (s.kategori !== blok.kategori) push(`kategori "${s.kategori}" != mapping "${blok.kategori}"`);
  if (s.tingkat !== blok.tingkat) push(`tingkat "${s.tingkat}" != mapping "${blok.tingkat}"`);
  if (s.blok !== blok.id) push(`blok "${s.blok}" != mapping "${blok.id}"`);

  // hitung ulang teks soal dari nol
  let nilai: number;
  try {
    nilai = hitungTeks(s.soal);
  } catch (e) {
    push(`teks soal gagal di-parse: ${(e as Error).message}`);
    return;
  }
  if (r6(nilai) !== r6(s.jawaban)) {
    push(`kunci jawaban ${s.jawaban} tidak cocok dengan hasil hitung ulang ${nilai}`);
  }

  const kurung = s.soal.includes('(');
  if (blok.kurung === 'wajib' && !kurung) push('seharusnya bertanda kurung');
  if (blok.kurung === 'larang' && kurung) push('seharusnya tanpa tanda kurung');

  const jumlahOps = (s.soal.match(/[+\-×÷:]/g) ?? []).length;
  if (jumlahOps < blok.minOps || jumlahOps > blok.maxOps) {
    push(`jumlah operasi ${jumlahOps}, seharusnya ${blok.minOps}-${blok.maxOps}`);
  }

  const punyaDesimal = /\d,\d/.test(s.soal);
  if (punyaDesimal && !blok.izinDesimal) push('desimal muncul di blok yang tidak mengizinkan');
  if (punyaDesimal !== s.desimal) push('penanda desimal tidak konsisten dengan teks soal');

  if (opsi.hindariNegatif && s.jawaban < 0) push('jawaban negatif');

  if (opsi.pilihanGanda) {
    if (s.opsi.length !== opsi.jumlahOpsi) push(`jumlah opsi ${s.opsi.length} != ${opsi.jumlahOpsi}`);
    if (new Set(s.opsi).size !== s.opsi.length) push('ada opsi yang kembar');
    const idx = 'ABCDEF'.indexOf(s.kunci);
    if (idx < 0 || idx >= s.opsi.length) push(`huruf kunci "${s.kunci}" di luar jangkauan opsi`);
    else if (s.opsi[idx] !== s.jawabanTeks) {
      push(`opsi ${s.kunci} = "${s.opsi[idx]}" tidak sama dengan jawaban "${s.jawabanTeks}"`);
    }
  }

  if (s.langkah.length < 1 || s.langkah[0] !== s.soal) push('langkah penyelesaian tidak diawali soal');

  // pembahasan: kalimat penutup harus menunjuk kunci yang benar
  const penutup = s.pembahasan.at(-1)?.isi ?? '';
  const penutupBenar = opsi.pilihanGanda
    ? penutup === `Jadi, jawaban yang tepat adalah ${s.kunci}.`
    : penutup === `Jadi, hasilnya adalah ${s.jawabanTeks}.`;
  if (!penutupBenar) push('kalimat penutup pembahasan tidak cocok dengan kunci jawaban');

  // pembahasan: tiap baris perhitungan harus benar secara aritmetika
  const barisHitung = s.pembahasan.filter((b) => b.jenis === 'hitung');
  if (!barisHitung.length) push('pembahasan tidak memuat baris perhitungan');
  for (const b of barisHitung) {
    const [kiri, kanan] = b.isi.split(' = ');
    try {
      if (r6(hitungTeks(kiri)) !== r6(hitungTeks(kanan))) {
        push(`baris pembahasan salah hitung: "${b.isi}"`);
      }
    } catch {
      push(`baris pembahasan gagal di-parse: "${b.isi}"`);
    }
  }
  // langkah terakhir pembahasan harus mendarat di jawaban
  const hasilAkhir = barisHitung.at(-1)?.isi.split(' = ')[1];
  if (hasilAkhir !== undefined) {
    try {
      if (r6(hitungTeks(hasilAkhir)) !== r6(s.jawaban)) {
        push('hasil akhir pembahasan tidak sama dengan kunci jawaban');
      }
    } catch {
      push('hasil akhir pembahasan tidak terbaca');
    }
  }
}

export function validasiPaket(paket: Paket, opsi: OpsiGenerate): TemuanValidasi[] {
  const temuan: TemuanValidasi[] = [];
  const push = (pesan: string, no: number | null = null) =>
    temuan.push({ paket: paket.nomor, no, pesan });

  if (paket.soal.length !== JUMLAH_SOAL) {
    push(`jumlah soal ${paket.soal.length}, seharusnya ${JUMLAH_SOAL}`);
  }

  paket.soal.forEach((s, i) => {
    if (s.no !== i + 1) push(`urutan nomor melompat di posisi ${i + 1}`, s.no);
    cekSoal(s, opsi, paket.nomor, temuan);
  });

  // urutan kategori tidak boleh diacak antarblok
  const urutanBlok = paket.soal.map((s) => s.blok);
  const harusnya = BLOK.flatMap((b) => Array(b.sampai - b.dari + 1).fill(b.id));
  if (urutanBlok.join('|') !== harusnya.join('|')) push('urutan kategori tidak sesuai mapping');

  // distribusi kategori & tingkat
  const hitung = (fn: (s: Soal) => string) =>
    paket.soal.reduce<Record<string, number>>((a, s) => ((a[fn(s)] = (a[fn(s)] ?? 0) + 1), a), {});
  const perKategori = hitung((s) => s.kategori);
  for (const [kat, exp] of Object.entries(DISTRIBUSI)) {
    if (kat === 'TOTAL') continue;
    const aktual = perKategori[kat] ?? 0;
    if (aktual !== exp.total) push(`distribusi ${kat}: ${aktual}, seharusnya ${exp.total}`);
  }
  const mudah = paket.soal.filter((s) => s.tingkat === 'Mudah').length;
  const sedang = paket.soal.length - mudah;
  if (mudah !== DISTRIBUSI.TOTAL.Mudah) push(`soal Mudah: ${mudah}, seharusnya ${DISTRIBUSI.TOTAL.Mudah}`);
  if (sedang !== DISTRIBUSI.TOTAL.Sedang) push(`soal Sedang: ${sedang}, seharusnya ${DISTRIBUSI.TOTAL.Sedang}`);

  // tidak boleh ada soal kembar di dalam satu paket
  const teks = paket.soal.map((s) => s.soal);
  if (new Set(teks).size !== teks.length) push('ada soal kembar di dalam paket ini');

  return temuan;
}

export function validasiSemua(paketList: Paket[], opsi: OpsiGenerate): LaporanValidasi {
  const temuan = paketList.flatMap((p) => validasiPaket(p, opsi));
  const semuaTeks = paketList.flatMap((p) => p.soal.map((s) => s.soal));
  const unik = new Set(semuaTeks).size;
  return {
    lolos: temuan.length === 0,
    totalSoal: semuaTeks.length,
    totalPaket: paketList.length,
    temuan,
    duplikatLintasPaket: semuaTeks.length - unik,
  };
}

export { render };
