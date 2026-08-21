/**
 * Perakit berkas keluaran: satu berkas gabungan, atau satu berkas per paket
 * yang dibungkus ZIP.
 *
 * Dipakai bersama oleh UI dan CLI supaya keduanya menghasilkan berkas yang
 * persis sama. Pustaka berat (docx, jspdf, fflate) di-import dinamis.
 */

import type { OpsiGenerate, Paket } from '../types';

/** Isi dokumen yang bisa dipilih pengguna. */
export type IsiBerkas = 'pembahasan' | 'soal' | 'berkunci' | 'kunci';

export type FormatBerkas = 'docx' | 'pdf';

export type Berkas = { nama: string; data: Uint8Array };

export const LABEL_ISI: Record<IsiBerkas, string> = {
  pembahasan: 'Soal + jawaban + pembahasan',
  soal: 'Naskah soal',
  berkunci: 'Soal + kunci di bawah opsi',
  kunci: 'Kunci jawaban',
};

/** Nama berkas yang aman dipakai di semua sistem operasi. */
export function namaAman(teks: string): string {
  return teks
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

async function docxKe(isi: IsiBerkas, paketList: Paket[], opsi: OpsiGenerate): Promise<Uint8Array> {
  const [{ Packer }, mod] = await Promise.all([import('docx'), import('./docx')]);
  const doc =
    isi === 'pembahasan'
      ? await mod.docxPembahasan(paketList, opsi)
      : isi === 'kunci'
        ? await mod.docxKunci(paketList, opsi, true)
        : await mod.docxSoal(paketList, { ...opsi, kunciDiBawahOpsi: isi === 'berkunci' });
  return new Uint8Array(await Packer.toArrayBuffer(doc));
}

async function pdfKe(isi: IsiBerkas, paketList: Paket[], opsi: OpsiGenerate): Promise<Uint8Array> {
  const mod = await import('./pdf');
  if (isi === 'pembahasan') return mod.pdfPembahasan(paketList, opsi);
  if (isi === 'kunci') return mod.pdfKunci(paketList, opsi);
  return mod.pdfSoal(paketList, { ...opsi, kunciDiBawahOpsi: isi === 'berkunci' });
}

/** Satu berkas berisi seluruh paket. */
export function dokumenGabungan(
  isi: IsiBerkas,
  paketList: Paket[],
  opsi: OpsiGenerate,
  format: FormatBerkas,
): Promise<Uint8Array> {
  return format === 'pdf' ? pdfKe(isi, paketList, opsi) : docxKe(isi, paketList, opsi);
}

/** Satu berkas untuk tiap paket, siap dibungkus ZIP. */
export async function berkasPerPaket(
  isi: IsiBerkas,
  paketList: Paket[],
  opsi: OpsiGenerate,
  format: FormatBerkas,
  /** dipanggil tiap satu paket selesai, untuk penunjuk kemajuan */
  lapor?: (selesai: number, total: number) => void,
): Promise<Berkas[]> {
  const hasil: Berkas[] = [];
  for (const [i, p] of paketList.entries()) {
    const data = format === 'pdf' ? await pdfKe(isi, [p], opsi) : await docxKe(isi, [p], opsi);
    hasil.push({ nama: `${p.kode}-${namaAman(isi)}.${format}`, data });
    lapor?.(i + 1, paketList.length);
    // beri napas ke UI supaya penunjuk kemajuan sempat tergambar
    if (typeof window !== 'undefined') await new Promise((r) => setTimeout(r, 0));
  }
  return hasil;
}

/**
 * Bungkus jadi ZIP. Berkas .docx sudah terkompresi (ia sendiri sebuah ZIP),
 * jadi disimpan apa adanya; PDF masih layak dipadatkan.
 */
export async function buatZip(berkas: Berkas[]): Promise<Uint8Array> {
  const { zipSync } = await import('fflate');
  const isi: Record<string, [Uint8Array, { level: 0 | 6 }]> = {};
  for (const b of berkas) {
    isi[b.nama] = [b.data, { level: b.nama.endsWith('.docx') ? 0 : 6 }];
  }
  return zipSync(isi);
}
