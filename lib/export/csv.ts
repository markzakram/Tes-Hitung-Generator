/**
 * Ekspor CSV.
 *
 * Pemisah kolom memakai titik koma karena angka Indonesia memakai koma
 * sebagai pemisah desimal. BOM UTF-8 ditambahkan supaya Excel membaca
 * tanda × dan ÷ dengan benar.
 */

import { statusTingkat } from '../mapping';
import { pembahasanTeks } from '../pembahasan';
import type { OpsiGenerate, Paket } from '../types';

const HURUF = ['A', 'B', 'C', 'D', 'E', 'F'];

function sel(v: unknown): string {
  const s = String(v ?? '');
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Satu baris per soal, seluruh paket digabung dalam satu berkas. */
export function csvSoal(paketList: Paket[], opsi: OpsiGenerate): string {
  const maxOpsi = opsi.pilihanGanda ? opsi.jumlahOpsi : 0;
  const header = [
    'paket',
    'kode_paket',
    'no',
    'kategori',
    'tingkat',
    'subkategori',
    'pola',
    'bentuk',
    'soal',
    'jawaban',
    ...Array.from({ length: maxOpsi }, (_, i) => `opsi_${HURUF[i].toLowerCase()}`),
    ...(opsi.pilihanGanda ? ['kunci'] : []),
    'desimal',
    'langkah',
    'pembahasan',
  ];

  const baris = paketList.flatMap((p) =>
    p.soal.map((s) =>
      [
        p.nomor,
        p.kode,
        s.no,
        s.kategori,
        statusTingkat(s.tingkat),
        s.subkategori,
        s.polaId,
        s.bentuk,
        s.soal,
        s.jawabanTeks,
        ...Array.from({ length: maxOpsi }, (_, i) => s.opsi[i] ?? ''),
        ...(opsi.pilihanGanda ? [s.kunci] : []),
        s.desimal ? 'ya' : 'tidak',
        s.langkah.join(' = '),
        pembahasanTeks(s.pembahasan).join(' | '),
      ]
        .map(sel)
        .join(';'),
    ),
  );

  return '﻿' + [header.join(';'), ...baris].join('\r\n');
}

/** Rekap kunci jawaban: satu baris per paket, 25 kolom jawaban. */
export function csvKunci(paketList: Paket[], opsi: OpsiGenerate): string {
  const header = ['kode_paket', ...Array.from({ length: 25 }, (_, i) => `no_${i + 1}`)];
  const baris = paketList.map((p) =>
    [p.kode, ...p.soal.map((s) => (opsi.pilihanGanda ? s.kunci : s.jawabanTeks))]
      .map(sel)
      .join(';'),
  );
  return '﻿' + [header.join(';'), ...baris].join('\r\n');
}
