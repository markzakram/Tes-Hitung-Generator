'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Kontrol from '@/components/Kontrol';
import LembarCetak, { type TipeCetak } from '@/components/LembarCetak';
import PanelEkspor from '@/components/PanelEkspor';
import PratinjauPaket from '@/components/PratinjauPaket';
import Ringkasan from '@/components/Ringkasan';
import TabelMapping from '@/components/TabelMapping';

import { generateSemua, normalisasiOpsi, ringkas } from '@/lib/generate';
import { DETIK_PER_SOAL } from '@/lib/mapping';
import { fmt } from '@/lib/num';
import { DEFAULT_OPSI, type OpsiGenerate, type Paket, type Ringkasan as TRingkasan } from '@/lib/types';
import { validasiSemua, type LaporanValidasi } from '@/lib/validate';

type Hasil = {
  paket: Paket[];
  opsi: OpsiGenerate;
  lap: LaporanValidasi;
  ring: TRingkasan;
  waktuMs: number;
};

const tombolKelas =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-[12.5px] font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

export default function Halaman() {
  const [opsi, setOpsi] = useState<OpsiGenerate>(DEFAULT_OPSI);
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [aktif, setAktif] = useState(0);
  const [tampilKunci, setTampilKunci] = useState(false);
  const [cetak, setCetak] = useState<{ tipe: TipeCetak; semua: boolean } | null>(null);
  const [kunciInline, setKunciInline] = useState(false);
  const sudahJalan = useRef(false);

  const ubah = useCallback((patch: Partial<OpsiGenerate>) => {
    setOpsi((o) => ({ ...o, ...patch }));
  }, []);

  const jalankan = useCallback(() => {
    setSibuk(true);
    setGalat(null);
    // beri kesempatan browser menggambar status "sedang membuat" dulu
    setTimeout(() => {
      try {
        const o = normalisasiOpsi(opsi);
        const t0 = performance.now();
        const paket = generateSemua(o);
        const waktuMs = Math.round(performance.now() - t0);
        setHasil({ paket, opsi: o, lap: validasiSemua(paket, o), ring: ringkas(paket), waktuMs });
        setAktif(0);
      } catch (e) {
        setHasil(null);
        setGalat(e instanceof Error ? e.message : String(e));
      } finally {
        setSibuk(false);
      }
    }, 30);
  }, [opsi]);

  // sekali saat halaman dibuka, supaya langsung ada contoh yang bisa dilihat
  useEffect(() => {
    if (sudahJalan.current) return;
    sudahJalan.current = true;
    jalankan();
  }, [jalankan]);

  // cetak setelah lembar cetak selesai dirender
  useEffect(() => {
    if (!cetak) return;
    const t = setTimeout(() => {
      window.print();
      setCetak(null);
    }, 120);
    return () => clearTimeout(t);
  }, [cetak]);

  const paketCetak = useMemo(() => {
    if (!hasil || !cetak) return [];
    return cetak.semua ? hasil.paket : [hasil.paket[aktif]];
  }, [hasil, cetak, aktif]);

  const opsiEkspor = hasil ? { ...hasil.opsi, kunciDiBawahOpsi: kunciInline } : null;
  const paketAktif = hasil?.paket[aktif];

  return (
    <>
      {/* ============================================================ layar */}
      <div className="tanpa-cetak">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <h1 className="text-[17px] font-extrabold tracking-tight text-slate-900">
                Generator Soal Tes Hitung Cepat
              </h1>
              <p className="text-[12px] text-slate-500">
                Mengikuti mapping 25 soal / 7 menit — Operasi Tunggal → Campuran → Bertingkat
              </p>
            </div>
            <div className="angka flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold text-slate-600">
                25 soal
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold text-slate-600">
                10 Mudah / 15 Sedang
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold text-slate-600">
                {fmt(DETIK_PER_SOAL)} detik per soal
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-5 py-6">
          <div className="grid gap-6 lg:grid-cols-[330px_minmax(0,1fr)]">
            {/* -------------------------------------------------- kontrol */}
            <aside className="lg:sticky lg:top-6 lg:self-start">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <Kontrol opsi={opsi} ubah={ubah} onGenerate={jalankan} sibuk={sibuk} />
              </div>
            </aside>

            {/* ---------------------------------------------------- hasil */}
            <div className="min-w-0 space-y-5">
              {galat ? (
                <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-[13px] text-red-800">
                  <strong>Gagal generate.</strong> {galat}
                </div>
              ) : null}

              {sibuk && !hasil ? (
                <div className="rounded-xl border border-slate-200 bg-white px-5 py-12 text-center text-sm text-slate-500 shadow-sm">
                  Sedang membuat soal...
                </div>
              ) : null}

              {hasil ? (
                <>
                  <Ringkasan
                    ringkasan={hasil.ring}
                    laporan={hasil.lap}
                    waktuMs={hasil.waktuMs}
                  />

                  <PanelEkspor
                    paket={hasil.paket}
                    opsi={hasil.opsi}
                    ringkasan={hasil.ring}
                    kunciInline={kunciInline}
                    setKunciInline={setKunciInline}
                    onCetak={(tipe, semua) => setCetak({ tipe, semua })}
                    onGalat={setGalat}
                  />

                  {/* ---------------------------------------- pratinjau */}
                  <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          className={tombolKelas + ' px-2.5'}
                          disabled={aktif === 0}
                          onClick={() => setAktif((i) => Math.max(0, i - 1))}
                        >
                          ‹
                        </button>
                        <select
                          value={aktif}
                          onChange={(e) => setAktif(Number(e.target.value))}
                          className="angka rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] font-semibold text-slate-800 outline-none focus:border-merah-500"
                        >
                          {hasil.paket.map((p, i) => (
                            <option key={p.kode} value={i}>
                              {p.kode}
                            </option>
                          ))}
                        </select>
                        <button
                          className={tombolKelas + ' px-2.5'}
                          disabled={aktif >= hasil.paket.length - 1}
                          onClick={() => setAktif((i) => Math.min(hasil.paket.length - 1, i + 1))}
                        >
                          ›
                        </button>
                        <span className="angka ml-1 text-[11.5px] text-slate-400">
                          seed {paketAktif?.seed}
                        </span>
                      </div>

                      <label className="flex cursor-pointer items-center gap-2 text-[12.5px] font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={tampilKunci}
                          onChange={(e) => setTampilKunci(e.target.checked)}
                          className="h-4 w-4 accent-emerald-600"
                        />
                        Tampilkan kunci &amp; pembahasan
                      </label>
                    </header>

                    {paketAktif ? (
                      <PratinjauPaket
                        paket={paketAktif}
                        opsi={hasil.opsi}
                        tampilKunci={tampilKunci}
                      />
                    ) : null}
                  </section>
                </>
              ) : null}

              <TabelMapping ketat={opsi.ketat} />

              <footer className="pb-8 text-center text-[11px] text-slate-400">
                Urutan kategori tidak diacak antarblok. Pengacakan hanya terjadi di dalam pool pada
                rentang nomor yang sama, sesuai catatan implementasi mapping.
              </footer>
            </div>
          </div>
        </main>
      </div>

      {/* ============================================================ cetak */}
      {cetak && hasil ? (
        <LembarCetak paketList={paketCetak} opsi={opsiEkspor ?? hasil.opsi} tipe={cetak.tipe} />
      ) : null}
    </>
  );
}
