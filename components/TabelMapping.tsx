'use client';

import { useState } from 'react';
import { BLOK, DISTRIBUSI } from '@/lib/mapping';
import { poolBlok } from '@/lib/patterns';

/**
 * Acuan mapping yang dipakai generator, ditampilkan apa adanya supaya hasil
 * generate bisa dicocokkan langsung dengan dokumen sumbernya.
 */
export default function TabelMapping({ ketat }: { ketat: boolean }) {
  const [buka, setBuka] = useState(false);

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setBuka((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left"
      >
        <span>
          <span className="block text-sm font-bold text-slate-800">Acuan mapping</span>
          <span className="block text-[12px] text-slate-500">
            Blok nomor, distribusi kesulitan, dan pool bentuk soal yang aktif
          </span>
        </span>
        <span className="shrink-0 text-xs font-semibold text-merah-600">
          {buka ? 'Tutup' : 'Lihat'}
        </span>
      </button>

      {buka ? (
        <div className="space-y-6 border-t border-slate-200 px-5 py-5">
          {/* ------------------------------------------------- blok nomor */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3 font-semibold">No. Soal</th>
                  <th className="py-2 pr-3 font-semibold">Kategori</th>
                  <th className="py-2 pr-3 font-semibold">Tingkat</th>
                  <th className="py-2 font-semibold">Pool / Subkategori</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {BLOK.map((b) => (
                  <tr key={b.id} className="align-top">
                    <td className="angka whitespace-nowrap py-2.5 pr-3 font-semibold text-slate-800">
                      {b.dari}-{b.sampai}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-3 text-slate-700">{b.kategori}</td>
                    <td className="whitespace-nowrap py-2.5 pr-3 text-slate-700">{b.tingkat}</td>
                    <td className="py-2.5 leading-relaxed text-slate-600">{b.pool}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ------------------------------------------------- distribusi */}
          <div>
            <h4 className="mb-2 text-[13px] font-bold text-slate-800">
              Distribusi kategori dan kesulitan
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[380px] text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-3 font-semibold">Kategori</th>
                    <th className="py-2 pr-3 text-right font-semibold">Mudah</th>
                    <th className="py-2 pr-3 text-right font-semibold">Sedang</th>
                    <th className="py-2 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(DISTRIBUSI).map(([nama, d]) => (
                    <tr key={nama} className={nama === 'TOTAL' ? 'font-bold text-slate-900' : ''}>
                      <td className="py-2 pr-3 text-slate-700">{nama}</td>
                      <td className="angka py-2 pr-3 text-right">{d.Mudah}</td>
                      <td className="angka py-2 pr-3 text-right">{d.Sedang}</td>
                      <td className="angka py-2 text-right">{d.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ------------------------------------------------ pool aktif */}
          <div>
            <h4 className="mb-1 text-[13px] font-bold text-slate-800">
              Bentuk soal yang aktif {ketat ? '(mode ketat)' : ''}
            </h4>
            <p className="mb-3 text-[11.5px] text-slate-500">
              Tanda <span className="font-semibold text-merah-700">M</span> = bentuk yang tertulis
              persis di dokumen mapping. Tanpa tanda = variasi setara dengan jumlah operasi dan
              beban hitung yang sama, hanya aktif saat mode ketat dimatikan.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {BLOK.map((b) => {
                const pool = poolBlok(b.id, ketat);
                return (
                  <div key={b.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="angka mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      Soal {b.dari}-{b.sampai}
                      <span className="ml-1 font-normal normal-case tracking-normal text-slate-400">
                        ({pool.length} bentuk)
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {pool.map((p) => (
                        <li key={p.id} className="flex items-center gap-1.5">
                          <span
                            className={`angka inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-bold ${
                              p.canonical
                                ? 'bg-merah-100 text-merah-700'
                                : 'bg-slate-200 text-slate-400'
                            }`}
                          >
                            {p.canonical ? 'M' : '~'}
                          </span>
                          <span className="angka text-[12px] text-slate-700">{p.bentuk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
