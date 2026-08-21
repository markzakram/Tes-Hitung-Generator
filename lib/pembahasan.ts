/**
 * Penyusun pembahasan berbahasa Indonesia.
 *
 * Narasinya dibangun dari langkah reduksi ekspresi, bukan template tetap,
 * sehingga alasan tiap langkah benar-benar mencerminkan struktur soalnya:
 * tanda kurung dikerjakan lebih dahulu, lalu perkalian/pembagian, baru
 * penjumlahan/pengurangan. Angka yang berasal dari langkah sebelumnya juga
 * disebut sebagai "hasilnya", bukan diulang sebagai angka lepas.
 */

import { reduksi, type AsalOperand, type Node, type Op } from './expr';

export type BarisPembahasan = {
  /** 'teks' = kalimat penjelas, 'hitung' = baris perhitungan */
  jenis: 'teks' | 'hitung';
  isi: string;
};

const NAMA_OP: Record<Op, string> = {
  '+': 'penjumlahan',
  '-': 'pengurangan',
  '×': 'perkalian',
  '÷': 'pembagian',
};

const KATA_KERJA: Record<Op, string> = {
  '+': 'jumlahkan',
  '-': 'kurangkan',
  '×': 'kalikan',
  '÷': 'bagi',
};

const KONEKTOR = ['Kemudian', 'Selanjutnya', 'Setelah itu', 'Lalu'];

/** Sebut operand apa adanya, atau sebagai rujukan ke langkah sebelumnya. */
function frasa(teks: string, asal: AsalOperand): string {
  if (asal === 'terakhir') return 'hasilnya';
  if (asal === 'kurung') return `hasil di dalam kurung (${teks})`;
  if (asal === 'lampau') return `hasil sebelumnya (${teks})`;
  return teks;
}

const kapital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export type OpsiPembahasan = {
  /** huruf kunci bila soal berbentuk pilihan ganda */
  kunci?: string;
  jawabanTeks: string;
  /** lambang pembagian yang dipakai pada teks soal */
  simbolBagi: string;
};

export function susunPembahasan(node: Node, o: OpsiPembahasan): BarisPembahasan[] {
  const langkah = reduksi(node);
  const baris: BarisPembahasan[] = [];
  const total = langkah.length;

  langkah.forEach((L, i) => {
    const konektor = total >= 3 && L.selesai ? 'Terakhir' : KONEKTOR[(i - 1 + 4) % 4];
    // kalau kedua operand sama-sama hasil langkah lalu, sebut angkanya saja -
    // "hasilnya dengan hasil sebelumnya" justru membingungkan
    const duaHasil = L.asalKiri !== null && L.asalKanan !== null;
    const perintah = duaHasil
      ? `${KATA_KERJA[L.op]} ${L.kiri} dengan ${L.kanan}`
      : `${KATA_KERJA[L.op]} ${frasa(L.kiri, L.asalKiri)} dengan ${frasa(L.kanan, L.asalKanan)}`;

    let kalimat: string;
    if (i === 0) {
      if (L.dalamKurung) kalimat = 'Kerjakan operasi di dalam tanda kurung terlebih dahulu.';
      else if (L.adaTambahKurangLain)
        kalimat =
          `Kerjakan ${NAMA_OP[L.op]} lebih dahulu karena berprioritas lebih tinggi ` +
          `daripada penjumlahan dan pengurangan.`;
      else if (total === 1) kalimat = `${kapital(perintah)}.`;
      else
        kalimat = 'Semua operasinya berprioritas sama, jadi kerjakan berurutan dari kiri ke kanan.';
    } else if (L.dalamKurung) {
      kalimat = `${konektor}, kerjakan operasi di dalam tanda kurung berikutnya.`;
    } else {
      kalimat = `${konektor}, ${perintah}.`;
    }

    baris.push({ jenis: 'teks', isi: kalimat });
    baris.push({
      jenis: 'hitung',
      isi: `${L.kiri} ${L.op === '÷' ? o.simbolBagi : L.op} ${L.kanan} = ${L.hasilTeks}`,
    });
  });

  baris.push({
    jenis: 'teks',
    isi: o.kunci
      ? `Jadi, jawaban yang tepat adalah ${o.kunci}.`
      : `Jadi, hasilnya adalah ${o.jawabanTeks}.`,
  });

  return baris;
}

/** Versi datar untuk CSV/JSON. */
export function pembahasanTeks(baris: BarisPembahasan[]): string[] {
  return baris.map((b) => b.isi);
}
