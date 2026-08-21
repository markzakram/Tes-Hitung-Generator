'use client';

import { BLOK } from '@/lib/mapping';
import type { OpsiGenerate, Paket } from '@/lib/types';

const HURUF = ['A', 'B', 'C', 'D', 'E', 'F'];

/** Samakan lambang pembagian pada label pola dengan yang dipakai di soal. */
const lambangPembagi = (teks: string, simbol: string) =>
  simbol === '÷' ? teks : teks.replace(/÷/g, simbol);

const WARNA_BLOK: Record<string, string> = {
  'tunggal-mudah': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'campuran-mudah': 'bg-sky-50 text-sky-700 border-sky-200',
  'campuran-sedang': 'bg-biru-50 text-biru-700 border-biru-100',
  'bertingkat-sedang': 'bg-amber-50 text-amber-700 border-amber-200',
  'bertingkat-menantang': 'bg-merah-50 text-merah-700 border-merah-200',
};

export default function PratinjauPaket({
  paket,
  opsi,
  tampilKunci,
}: {
  paket: Paket;
  opsi: OpsiGenerate;
  tampilKunci: boolean;
}) {
  return (
    <div className="divide-y divide-slate-100">
      {BLOK.map((b) => {
        const lambang = (t: string) => lambangPembagi(t, opsi.simbolBagi);
        const soal = paket.soal.filter((s) => s.blok === b.id);
        return (
          <section key={b.id} className="px-5 py-4">
            <header className="mb-3 flex flex-wrap items-center gap-2">
              <span
                className={`angka rounded-md border px-2 py-0.5 text-[11px] font-bold ${
                  WARNA_BLOK[b.id] ?? 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                Soal {b.dari}-{b.sampai}
              </span>
              <span className="text-[12.5px] font-semibold text-slate-700">{b.kategori}</span>
              <span className="text-[12px] text-slate-400">•</span>
              <span className="text-[12px] text-slate-500">{b.tingkat}</span>
            </header>

            <ol className="grid gap-3 sm:grid-cols-2">
              {soal.map((s) => (
                <li
                  key={s.no}
                  className="rounded-lg border border-slate-200 bg-white p-3 transition hover:border-slate-300"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="angka w-6 shrink-0 text-[12px] font-bold text-slate-400">
                      {s.no}.
                    </span>
                    <span className="min-w-0">
                      {opsi.tampilkanTingkat ? (
                        <span className="mb-0.5 block text-[10.5px] text-slate-400">
                          <span className="font-semibold">Tingkat Kesulitan:</span> {s.tingkat}
                        </span>
                      ) : null}
                      <span className="angka text-[15px] font-semibold text-slate-900">
                        {s.soal} = ...
                      </span>
                    </span>
                  </div>

                  {opsi.pilihanGanda ? (
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 pl-8">
                      {s.opsi.map((o, i) => {
                        const kunci = tampilKunci && HURUF[i] === s.kunci;
                        return (
                          <span
                            key={i}
                            className={`angka rounded px-1.5 py-0.5 text-[12.5px] ${
                              kunci
                                ? 'bg-emerald-100 font-bold text-emerald-800'
                                : 'text-slate-600'
                            }`}
                          >
                            <span className="font-semibold">{HURUF[i]}.</span> {o}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-2 pl-8">
                      <span className="angka inline-block min-w-[90px] border-b border-dashed border-slate-300 pb-0.5 text-[13px] text-slate-400">
                        {tampilKunci ? (
                          <span className="font-bold text-emerald-700">{s.jawabanTeks}</span>
                        ) : (
                          <>&nbsp;</>
                        )}
                      </span>
                    </div>
                  )}

                  {tampilKunci ? (
                    <div className="mt-2 border-t border-dashed border-slate-200 pt-2 pl-8">
                      <p className="mb-1 text-[11px] font-bold text-slate-700">
                        Jawaban: {opsi.pilihanGanda ? s.kunci : s.jawabanTeks}
                      </p>
                      <p className="mb-0.5 text-[11px] font-bold text-slate-700">Pembahasan:</p>
                      {s.pembahasan.map((baris, i) => (
                        <p
                          key={i}
                          className={
                            baris.jenis === 'hitung'
                              ? 'angka pl-3 text-[11.5px] font-semibold text-slate-700'
                              : 'text-[11.5px] leading-relaxed text-slate-500'
                          }
                        >
                          {baris.isi}
                        </p>
                      ))}
                      <p className="mt-1.5 text-[10.5px] text-slate-400">
                        {s.subkategori === s.bentuk ? (
                          <>
                            pola <span className="angka">{lambang(s.bentuk)}</span>
                          </>
                        ) : (
                          <>
                            {s.subkategori} · pola{' '}
                            <span className="angka">{lambang(s.bentuk)}</span>
                          </>
                        )}
                        {s.desimal ? ' · desimal' : ''}
                      </p>
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
