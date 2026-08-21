'use client';

import type { Ringkasan as TRingkasan } from '@/lib/types';
import type { LaporanValidasi } from '@/lib/validate';

function Stat({ label, nilai, catatan }: { label: string; nilai: string; catatan?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="angka mt-0.5 text-lg font-bold leading-tight text-slate-900">{nilai}</div>
      {catatan ? <div className="text-[10.5px] text-slate-500">{catatan}</div> : null}
    </div>
  );
}

export default function Ringkasan({
  ringkasan: r,
  laporan: lap,
  waktuMs,
}: {
  ringkasan: TRingkasan;
  laporan: LaporanValidasi;
  waktuMs: number;
}) {
  const n = (x: number) => x.toLocaleString('id-ID');

  return (
    <section className="space-y-3">
      <div
        className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
          lap.lolos
            ? 'border-emerald-200 bg-emerald-50'
            : 'border-red-300 bg-red-50'
        }`}
      >
        <span
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
            lap.lolos ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          {lap.lolos ? '✓' : '!'}
        </span>
        <div className="min-w-0">
          <p
            className={`text-[13.5px] font-bold ${
              lap.lolos ? 'text-emerald-900' : 'text-red-900'
            }`}
          >
            {lap.lolos
              ? 'Semua soal sesuai mapping'
              : `${lap.temuan.length} temuan tidak sesuai mapping`}
          </p>
          <p
            className={`text-[11.5px] leading-relaxed ${
              lap.lolos ? 'text-emerald-800' : 'text-red-800'
            }`}
          >
            {lap.lolos ? (
              <>
                {n(lap.totalSoal)} soal diperiksa ulang: urutan blok, kategori, tingkat,
                distribusi 10 Mudah / 15 Sedang, jumlah operasi, aturan tanda kurung dan desimal,
                serta setiap teks soal dihitung ulang dari nol untuk mencocokkan kunci jawabannya.
              </>
            ) : (
              <>Perbaiki opsi generate atau ganti seed, lalu jalankan ulang.</>
            )}
          </p>

          {!lap.lolos ? (
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-[11.5px] text-red-800">
              {lap.temuan.slice(0, 30).map((t, i) => (
                <li key={i} className="angka">
                  Paket {t.paket} soal {t.no ?? '-'}: {t.pesan}
                </li>
              ))}
              {lap.temuan.length > 30 ? (
                <li className="text-red-600">... dan {lap.temuan.length - 30} temuan lain</li>
              ) : null}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Paket" nilai={n(r.totalPaket)} catatan="25 soal per paket" />
        <Stat label="Total soal" nilai={n(r.totalSoal)} catatan={`dibuat ${n(waktuMs)} ms`} />
        <Stat
          label="Soal unik"
          nilai={n(r.soalUnik)}
          catatan={r.duplikat ? `${n(r.duplikat)} berulang` : 'tanpa pengulangan'}
        />
        <Stat label="Bentuk terpakai" nilai={n(r.polaTerpakai)} catatan="variasi pola" />
        <Stat
          label="Soal desimal"
          nilai={n(r.soalDesimal)}
          catatan={`${Math.round((r.soalDesimal / Math.max(1, r.totalSoal)) * 100)}% dari total`}
        />
      </div>
    </section>
  );
}
