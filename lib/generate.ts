/**
 * Perakit paket soal.
 *
 * Urutan nomor mengikuti blok mapping secara kaku (tidak diacak antarkategori);
 * pengacakan hanya terjadi DI DALAM pool pada rentang nomor yang sama, persis
 * seperti catatan implementasi pada dokumen mapping.
 */

import { evaluate, operands, render, steps, type Node } from './expr';
import { BLOK, JUMLAH_SOAL, type Blok } from './mapping';
import { fmt } from './num';
import { buatOpsi, rencanaPosisiKunci } from './distractors';
import { susunPembahasan } from './pembahasan';
import { poolBlok, type BuildOpts, type PatternDef } from './patterns';
import { createRng, type Rng } from './rng';
import { DEFAULT_OPSI, type OpsiGenerate, type Paket, type Ringkasan, type Soal } from './types';
import { aturanHitung, cekNode } from './validate';

/** Berapa kali mengundi angka sebelum menyerah pada satu pola. */
const COBA_POLA = 60;
/** Berapa kali berganti pola sebelum menerima soal yang sudah pernah muncul. */
const COBA_GANTI = 40;

/**
 * Rencana pola untuk sekelompok slot.
 * `merata` menyebar subkategori agar satu blok tidak memakai bentuk yang
 * itu-itu saja. Ini tetap sekadar "mengambil salah satu variasi dari pool",
 * bukan menjadikan subkategori sebagai jatah wajib.
 */
function rencanaPola(pool: PatternDef[], slot: number, rnd: Rng, merata: boolean): PatternDef[] {
  if (!merata || pool.length === 0) {
    return Array.from({ length: slot }, () => rnd.pick(pool));
  }
  const subs = [...new Set(pool.map((p) => p.sub))];
  const urutan: string[] = [];
  while (urutan.length < slot) urutan.push(...rnd.shuffle(subs));
  return urutan.slice(0, slot).map((s) => rnd.pick(pool.filter((p) => p.sub === s)));
}

type Kandidat = { node: Node; pola: PatternDef; nilai: number };

function undiKandidat(
  pola: PatternDef,
  blok: Blok,
  rnd: Rng,
  opsi: OpsiGenerate,
  bo: BuildOpts,
): Kandidat | null {
  for (let i = 0; i < COBA_POLA; i++) {
    let node: Node | null = null;
    try {
      node = pola.build(rnd, bo);
    } catch {
      node = null;
    }
    if (!node) continue;
    if (cekNode(node, blok, opsi).length) continue;
    const hasil = evaluate(node, aturanHitung(opsi));
    if (!hasil.ok) continue;
    return { node, pola, nilai: hasil.value };
  }
  return null;
}

function buatSoal(
  no: number,
  blok: Blok,
  rnd: Rng,
  opsi: OpsiGenerate,
  polaRencana: PatternDef,
  pool: PatternDef[],
  posisiKunci: number,
  dipakaiGlobal: Set<string>,
  dipakaiPaket: Set<string>,
): Soal {
  const bo: BuildOpts = {
    desimal: opsi.desimal && blok.izinDesimal,
    pDesimal: opsi.pDesimal,
  };

  let terpilih: Kandidat | null = null;
  let cadangan: Kandidat | null = null;

  for (let putaran = 0; putaran < COBA_GANTI; putaran++) {
    const pola = putaran === 0 ? polaRencana : rnd.pick(pool);
    const k = undiKandidat(pola, blok, rnd, opsi, bo);
    if (!k) continue;
    const teks = render(k.node);
    if (dipakaiPaket.has(teks)) continue;
    // cadangan dipakai kalau seluruh pool sudah habis kombinasi barunya
    if (!cadangan) cadangan = k;
    if (!dipakaiGlobal.has(teks)) {
      terpilih = k;
      break;
    }
  }

  const k = terpilih ?? cadangan;
  if (!k) {
    throw new Error(
      `Gagal membuat soal nomor ${no} (blok ${blok.id}). ` +
        `Coba longgarkan opsi: matikan mode ketat atau kurangi jumlah paket.`,
    );
  }

  // bentuk kanonik (selalu memakai ÷) dipakai sebagai kunci anti-kembar,
  // supaya pilihan lambang pembagian tidak memengaruhi keunikan soal
  const kanonik = render(k.node);
  dipakaiGlobal.add(kanonik);
  dipakaiPaket.add(kanonik);

  const pg = opsi.pilihanGanda
    ? buatOpsi(k.node, k.nilai, rnd, opsi.jumlahOpsi, opsi.urutkanOpsi, posisiKunci)
    : { opsi: [], kunci: '', nilaiOpsi: [] };

  const simbol = (t: string) => (opsi.simbolBagi === '÷' ? t : t.replace(/÷/g, opsi.simbolBagi));

  return {
    no,
    kategori: blok.kategori,
    tingkat: blok.tingkat,
    blok: blok.id,
    subkategori: k.pola.sub,
    polaId: k.pola.id,
    bentuk: k.pola.bentuk,
    soal: simbol(kanonik),
    jawaban: k.nilai,
    jawabanTeks: fmt(k.nilai),
    opsi: pg.opsi,
    kunci: pg.kunci,
    langkah: steps(k.node).map(simbol),
    pembahasan: susunPembahasan(k.node, {
      kunci: pg.kunci || undefined,
      jawabanTeks: fmt(k.nilai),
      simbolBagi: opsi.simbolBagi,
    }),
    desimal: operands(k.node).some((v) => !Number.isInteger(v)),
  };
}

export function generatePaket(
  nomor: number,
  opsi: OpsiGenerate,
  dipakaiGlobal: Set<string> = new Set(),
): Paket {
  const seedPaket = `${opsi.seed}#${nomor}`;
  const rnd = createRng(seedPaket);
  const dipakaiPaket = new Set<string>();
  const soal: Soal[] = [];
  // sebaran kunci A-E disiapkan di muka supaya merata dalam satu paket
  const posisiKunci = rencanaPosisiKunci(rnd, JUMLAH_SOAL, opsi.jumlahOpsi);

  for (const blok of BLOK) {
    const slot = blok.sampai - blok.dari + 1;
    const pool = poolBlok(blok.id, opsi.ketat).filter((p) => {
      // pola khusus desimal tidak berguna kalau desimal dimatikan
      if (!opsi.desimal || !blok.izinDesimal) return !p.id.endsWith('-desimal');
      return true;
    });
    if (!pool.length) throw new Error(`Pool pola kosong untuk blok ${blok.id}`);

    const rencana = rencanaPola(pool, slot, rnd, opsi.variasiMerata);
    for (let i = 0; i < slot; i++) {
      soal.push(
        buatSoal(
          blok.dari + i,
          blok,
          rnd,
          opsi,
          rencana[i],
          pool,
          posisiKunci[blok.dari + i - 1],
          dipakaiGlobal,
          dipakaiPaket,
        ),
      );
    }
  }

  if (soal.length !== JUMLAH_SOAL) {
    throw new Error(`Paket ${nomor} menghasilkan ${soal.length} soal, seharusnya ${JUMLAH_SOAL}`);
  }

  return {
    nomor,
    kode: `PAKET-${String(nomor).padStart(2, '0')}`,
    seed: seedPaket,
    soal,
  };
}

export function generateSemua(opsiSebagian: Partial<OpsiGenerate> = {}): Paket[] {
  const opsi: OpsiGenerate = { ...DEFAULT_OPSI, ...opsiSebagian };
  const jumlah = Math.max(1, Math.min(500, Math.floor(opsi.jumlahPaket)));
  const dipakaiGlobal = new Set<string>();
  const hasil: Paket[] = [];
  for (let i = 1; i <= jumlah; i++) hasil.push(generatePaket(i, opsi, dipakaiGlobal));
  return hasil;
}

export function ringkas(paketList: Paket[]): Ringkasan {
  const semua = paketList.flatMap((p) => p.soal);
  const perKategori: Record<string, number> = {};
  const perTingkat: Record<string, number> = {};
  const pola = new Set<string>();
  const teks = new Set<string>();
  const perKunci: Record<string, number> = {};
  let desimal = 0;

  for (const s of semua) {
    perKategori[s.kategori] = (perKategori[s.kategori] ?? 0) + 1;
    perTingkat[s.tingkat] = (perTingkat[s.tingkat] ?? 0) + 1;
    pola.add(s.polaId);
    teks.add(s.soal);
    if (s.kunci) perKunci[s.kunci] = (perKunci[s.kunci] ?? 0) + 1;
    if (s.desimal) desimal++;
  }

  return {
    totalPaket: paketList.length,
    totalSoal: semua.length,
    perKategori,
    perTingkat,
    polaTerpakai: pola.size,
    perKunci,
    soalDesimal: desimal,
    soalUnik: teks.size,
    duplikat: semua.length - teks.size,
  };
}

export function normalisasiOpsi(input: Partial<OpsiGenerate>): OpsiGenerate {
  const o: OpsiGenerate = { ...DEFAULT_OPSI, ...input };
  return {
    ...o,
    jumlahPaket: Math.max(1, Math.min(500, Math.floor(Number(o.jumlahPaket) || 1))),
    jumlahOpsi: Math.max(3, Math.min(6, Math.floor(Number(o.jumlahOpsi) || 5))),
    pDesimal: Math.max(0, Math.min(1, Number(o.pDesimal) || 0)),
    durasiMenit: Math.max(1, Math.min(180, Number(o.durasiMenit) || 7)),
    seed: String(o.seed || 'KAI').slice(0, 64),
    simbolBagi: o.simbolBagi === ':' ? ':' : '÷',
    kunciDiBawahOpsi: Boolean(o.kunciDiBawahOpsi),
    tampilkanTingkat: o.tampilkanTingkat !== false,
  };
}
