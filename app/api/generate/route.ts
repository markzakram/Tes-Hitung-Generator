/**
 * API generate paket soal.
 *
 *   GET  /api/generate?paket=5&seed=KAI-2026
 *   GET  /api/generate?paket=5&format=csv
 *   POST /api/generate     body: { jumlahPaket, seed, ketat, pilihanGanda, ... }
 *
 * Balasan selalu menyertakan laporan validasi mapping, jadi pemanggil bisa
 * memastikan soal yang diterima memang sudah sesuai blueprint.
 */

import { NextResponse } from 'next/server';

import { csvKunci, csvSoal } from '@/lib/export/csv';
import { generateSemua, normalisasiOpsi, ringkas } from '@/lib/generate';
import { BLOK, DISTRIBUSI, JUMLAH_SOAL } from '@/lib/mapping';
import { DEFAULT_OPSI, type OpsiGenerate } from '@/lib/types';
import { validasiSemua } from '@/lib/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Batas aman ukuran balasan serverless. Untuk lebih banyak, pakai UI atau CLI. */
const MAKS_PAKET_API = 100;

const bool = (v: string | null, fallback: boolean) =>
  v === null ? fallback : ['1', 'true', 'ya', 'yes'].includes(v.toLowerCase());

function bangunOpsi(masukan: Partial<OpsiGenerate>): OpsiGenerate {
  const o = normalisasiOpsi({ ...DEFAULT_OPSI, ...masukan });
  return { ...o, jumlahPaket: Math.min(o.jumlahPaket, MAKS_PAKET_API) };
}

function balas(opsi: OpsiGenerate, format: string | null) {
  const paket = generateSemua(opsi);
  const lap = validasiSemua(paket, opsi);
  const r = ringkas(paket);

  if (format === 'csv') {
    return new NextResponse(csvSoal(paket, opsi), {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="soal-${opsi.seed}-${paket.length}paket.csv"`,
      },
    });
  }
  if (format === 'csv-kunci') {
    return new NextResponse(csvKunci(paket, opsi), {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="kunci-${opsi.seed}-${paket.length}paket.csv"`,
      },
    });
  }

  return NextResponse.json({
    ok: lap.lolos,
    mapping: {
      jumlahSoalPerPaket: JUMLAH_SOAL,
      blok: BLOK.map((b) => ({
        nomor: `${b.dari}-${b.sampai}`,
        kategori: b.kategori,
        tingkat: b.tingkat,
      })),
      distribusi: DISTRIBUSI,
    },
    opsi,
    ringkasan: r,
    validasi: {
      lolos: lap.lolos,
      jumlahTemuan: lap.temuan.length,
      temuan: lap.temuan.slice(0, 50),
    },
    paket,
  });
}

export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams;
    const opsi = bangunOpsi({
      jumlahPaket: Number(q.get('paket') ?? q.get('jumlahPaket') ?? 1),
      seed: q.get('seed') ?? DEFAULT_OPSI.seed,
      jumlahOpsi: Number(q.get('opsi') ?? DEFAULT_OPSI.jumlahOpsi),
      durasiMenit: Number(q.get('durasi') ?? DEFAULT_OPSI.durasiMenit),
      judul: q.get('judul') ?? DEFAULT_OPSI.judul,
      instansi: q.get('instansi') ?? DEFAULT_OPSI.instansi,
      pilihanGanda: bool(q.get('pilihanGanda'), DEFAULT_OPSI.pilihanGanda),
      ketat: bool(q.get('ketat'), DEFAULT_OPSI.ketat),
      desimal: bool(q.get('desimal'), DEFAULT_OPSI.desimal),
      pDesimal: Number(q.get('pDesimal') ?? DEFAULT_OPSI.pDesimal),
      urutkanOpsi: bool(q.get('urutkanOpsi'), DEFAULT_OPSI.urutkanOpsi),
      variasiMerata: bool(q.get('variasiMerata'), DEFAULT_OPSI.variasiMerata),
      hindariNegatif: bool(q.get('hindariNegatif'), DEFAULT_OPSI.hindariNegatif),
    });
    return balas(opsi, q.get('format'));
  } catch (e) {
    return NextResponse.json(
      { ok: false, pesan: e instanceof Error ? e.message : 'Gagal generate' },
      { status: 400 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<OpsiGenerate> & { format?: string };
    const { format = null, ...masukan } = body ?? {};
    return balas(bangunOpsi(masukan), format);
  } catch (e) {
    return NextResponse.json(
      { ok: false, pesan: e instanceof Error ? e.message : 'Body JSON tidak valid' },
      { status: 400 },
    );
  }
}
