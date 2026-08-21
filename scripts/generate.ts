/**
 * Generate paket soal dari terminal (tanpa membuka browser).
 *
 *   npm run generate -- --paket 100 --seed KAI-2026
 *   npm run generate -- --paket 25 --seed UJI --isian --ketat --out hasil/uji
 *
 * Opsi:
 *   --paket <n>        jumlah paket           (default 10, maksimal 500)
 *   --seed <teks>      seed acak              (default KAI-2026)
 *   --out <folder>     folder keluaran        (default output)
 *   --opsi <4|5>       jumlah opsi PG         (default 5)
 *   --judul <teks>     judul di kop soal
 *   --instansi <teks>  nama instansi di kop soal
 *   --durasi <menit>   durasi pengerjaan      (default 7)
 *   --isian            mode isian singkat (bukan pilihan ganda)
 *   --ketat            hanya pakai bentuk soal yang tertulis di mapping
 *   --tanpa-desimal    matikan bilangan desimal
 *   --acak-opsi        jangan urutkan opsi menaik
 *   --langkah          sertakan ringkasan langkah di kunci .docx
 *   --simbol-bagi <s>  lambang pembagian: '÷' (default) atau ':'
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Packer } from 'docx';

import { generateSemua, normalisasiOpsi, ringkas } from '../lib/generate';
import { csvKunci, csvSoal } from '../lib/export/csv';
import { docxKunci, docxPembahasan, docxSoal } from '../lib/export/docx';
import { DEFAULT_OPSI, type OpsiGenerate } from '../lib/types';
import { validasiSemua } from '../lib/validate';

const argv = process.argv.slice(2);
const flag = (n: string) => argv.includes(`--${n}`);
const nilai = (n: string, fallback?: string) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};

const opsi: OpsiGenerate = normalisasiOpsi({
  ...DEFAULT_OPSI,
  jumlahPaket: Number(nilai('paket', '10')),
  seed: nilai('seed', 'KAI-2026')!,
  jumlahOpsi: Number(nilai('opsi', '5')),
  judul: nilai('judul', DEFAULT_OPSI.judul)!,
  instansi: nilai('instansi', DEFAULT_OPSI.instansi)!,
  durasiMenit: Number(nilai('durasi', '7')),
  pilihanGanda: !flag('isian'),
  ketat: flag('ketat'),
  desimal: !flag('tanpa-desimal'),
  urutkanOpsi: !flag('acak-opsi'),
  simbolBagi: nilai('simbol-bagi', '÷') === ':' ? ':' : '÷',
});

async function main() {
  const outDir = resolve(process.cwd(), nilai('out', 'output')!);
  mkdirSync(outDir, { recursive: true });

  console.log(`Membuat ${opsi.jumlahPaket} paket x 25 soal (seed "${opsi.seed}")...`);
  const t0 = Date.now();
  const paket = generateSemua(opsi);
  const lap = validasiSemua(paket, opsi);
  const r = ringkas(paket);
  console.log(`Selesai dalam ${Date.now() - t0} ms.`);

  if (!lap.lolos) {
    console.error(`\nVALIDASI GAGAL - ${lap.temuan.length} temuan:`);
    for (const t of lap.temuan.slice(0, 20)) {
      console.error(`  paket ${t.paket} soal ${t.no ?? '-'}: ${t.pesan}`);
    }
    process.exitCode = 1;
    return;
  }

  const tulis = (nama: string, isi: string | Buffer) => {
    const p = join(outDir, nama);
    writeFileSync(p, isi);
    const kb = (Buffer.isBuffer(isi) ? isi.length : Buffer.byteLength(isi)) / 1024;
    console.log(`  ${nama.padEnd(24)} ${kb.toFixed(0)} KB`);
  };

  console.log('\nMenulis berkas:');
  tulis('soal.json', JSON.stringify({ opsi, ringkasan: r, paket }, null, 2));
  tulis('soal.csv', csvSoal(paket, opsi));
  tulis('kunci.csv', csvKunci(paket, opsi));
  tulis('soal.docx', await Packer.toBuffer(await docxSoal(paket, opsi)));
  tulis('soal-pembahasan.docx', await Packer.toBuffer(await docxPembahasan(paket, opsi)));
  tulis('kunci.docx', await Packer.toBuffer(await docxKunci(paket, opsi, flag('langkah'))));

  const laporan = [
    `LAPORAN VALIDASI MAPPING`,
    `seed             : ${opsi.seed}`,
    `paket            : ${r.totalPaket}`,
    `total soal       : ${r.totalSoal}`,
    `soal unik        : ${r.soalUnik} (berulang antarpaket: ${r.duplikat})`,
    `pola terpakai    : ${r.polaTerpakai}`,
    `soal desimal     : ${r.soalDesimal}`,
    `per kategori     : ${Object.entries(r.perKategori).map(([k, v]) => `${k}=${v}`).join(', ')}`,
    `per tingkat      : ${Object.entries(r.perTingkat).map(([k, v]) => `${k}=${v}`).join(', ')}`,
    `status           : ${lap.lolos ? 'LOLOS - semua soal sesuai mapping' : 'GAGAL'}`,
    '',
    `Mode ketat       : ${opsi.ketat ? 'ya' : 'tidak'}`,
    `Desimal          : ${opsi.desimal ? `ya (peluang ${opsi.pDesimal})` : 'tidak'}`,
    `Bentuk jawaban   : ${opsi.pilihanGanda ? `pilihan ganda ${opsi.jumlahOpsi} opsi` : 'isian singkat'}`,
  ].join('\n');
  tulis('laporan-validasi.txt', laporan);

  console.log(`\nSemua berkas ada di: ${outDir}`);
  console.log(`Validasi: LOLOS (${r.totalSoal} soal, ${r.soalUnik} unik).`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
