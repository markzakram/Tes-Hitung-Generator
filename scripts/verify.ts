/**
 * Audit kepatuhan mapping.
 *
 *   npm run verify              -> 100 paket, opsi default
 *   npm run verify -- 250 SEED  -> jumlah paket & seed lain
 *
 * Menguji beberapa kombinasi opsi sekaligus, lalu mem-parse ulang setiap
 * teks soal dari nol untuk memastikan kunci jawabannya benar.
 */

import { generateSemua, ringkas } from '../lib/generate';
import { BLOK, DETIK_PER_SOAL, DISTRIBUSI } from '../lib/mapping';
import { SEMUA_POLA } from '../lib/patterns';
import { DEFAULT_OPSI, type OpsiGenerate } from '../lib/types';
import { validasiSemua } from '../lib/validate';

const argJumlah = Number(process.argv[2]) || 100;
const argSeed = process.argv[3] || 'AUDIT-2026';

const skenario: Array<{ nama: string; opsi: Partial<OpsiGenerate> }> = [
  { nama: 'Default (PG 5 opsi, desimal aktif, pola diperluas)', opsi: {} },
  { nama: 'Mode ketat (hanya bentuk kanonik mapping)', opsi: { ketat: true } },
  { nama: 'Tanpa desimal', opsi: { desimal: false } },
  { nama: 'Mode isian singkat', opsi: { pilihanGanda: false } },
  { nama: 'Desimal agresif (p=0,6) + opsi diacak', opsi: { pDesimal: 0.6, urutkanOpsi: false } },
  { nama: 'Tanpa penyebaran variasi', opsi: { variasiMerata: false } },
  { nama: 'Lambang pembagian ":"', opsi: { simbolBagi: ':' } },
  { nama: 'Isian singkat + lambang ":" + tanpa desimal', opsi: { pilihanGanda: false, simbolBagi: ':', desimal: false } },
];

let gagal = 0;

console.log('='.repeat(72));
console.log(`AUDIT MAPPING TES HITUNG CEPAT - ${argJumlah} paket x 25 soal per skenario`);
console.log('='.repeat(72));

for (const s of skenario) {
  const opsi: OpsiGenerate = { ...DEFAULT_OPSI, ...s.opsi, jumlahPaket: argJumlah, seed: argSeed };
  const t0 = process.hrtime.bigint();
  const paket = generateSemua(opsi);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;

  const lap = validasiSemua(paket, opsi);
  const r = ringkas(paket);
  const status = lap.lolos ? 'LOLOS' : 'GAGAL';
  if (!lap.lolos) gagal++;

  console.log(`\n[${status}] ${s.nama}`);
  console.log(`  soal          : ${lap.totalSoal} (${r.soalUnik} unik, ${r.duplikat} berulang antarpaket)`);
  console.log(`  pola terpakai : ${r.polaTerpakai} dari ${SEMUA_POLA.length} pola tersedia`);
  console.log(`  soal desimal  : ${r.soalDesimal}`);
  console.log(`  kategori      : ${Object.entries(r.perKategori).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  console.log(`  tingkat       : ${Object.entries(r.perTingkat).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  console.log(`  waktu generate: ${ms.toFixed(0)} ms`);

  if (!lap.lolos) {
    console.log(`  TEMUAN (${lap.temuan.length}):`);
    for (const t of lap.temuan.slice(0, 15)) {
      console.log(`    - paket ${t.paket} soal ${t.no ?? '-'}: ${t.pesan}`);
    }
    if (lap.temuan.length > 15) console.log(`    ... dan ${lap.temuan.length - 15} temuan lain`);
  }
}

/* ------------------------------------------------- contoh satu paket utuh */

const contoh = generateSemua({ jumlahPaket: 1, seed: argSeed })[0];
console.log('\n' + '='.repeat(72));
console.log(`CONTOH ${contoh.kode} (seed ${contoh.seed})`);
console.log('='.repeat(72));
for (const b of BLOK) {
  console.log(`\n-- Soal ${b.dari}-${b.sampai} | ${b.kategori} | ${b.tingkat}`);
  for (const s of contoh.soal.filter((x) => x.blok === b.id)) {
    const opsi = s.opsi.length
      ? '   [' + s.opsi.map((o, i) => `${'ABCDE'[i]}. ${o}`).join('  ') + ']'
      : '';
    console.log(`  ${String(s.no).padStart(2)}. ${s.soal.padEnd(26)} = ${s.jawabanTeks.padEnd(7)} (${s.kunci || 'isian'})${opsi}`);
  }
}

console.log('\n' + '='.repeat(72));
console.log(`Target mapping : ${DISTRIBUSI.TOTAL.total} soal (${DISTRIBUSI.TOTAL.Mudah} Mudah / ${DISTRIBUSI.TOTAL.Sedang} Sedang), ${DETIK_PER_SOAL.toFixed(1).replace(".", ",")} detik per soal`);
console.log(gagal === 0 ? 'HASIL AKHIR: SEMUA SKENARIO LOLOS' : `HASIL AKHIR: ${gagal} SKENARIO GAGAL`);
console.log('='.repeat(72));

process.exit(gagal === 0 ? 0 : 1);
