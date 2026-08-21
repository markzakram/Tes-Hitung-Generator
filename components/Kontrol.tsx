'use client';

import type { OpsiGenerate } from '@/lib/types';

type Props = {
  opsi: OpsiGenerate;
  ubah: (patch: Partial<OpsiGenerate>) => void;
  onGenerate: () => void;
  sibuk: boolean;
};

const PRESET_PAKET = [1, 10, 25, 50, 100];

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <span className="text-[13px] font-semibold text-slate-700">{children}</span>
      {hint ? <span className="text-[11px] text-slate-400">{hint}</span> : null}
    </div>
  );
}

function Saklar({
  aktif,
  ubah,
  judul,
  deskripsi,
}: {
  aktif: boolean;
  ubah: (v: boolean) => void;
  judul: string;
  deskripsi: string;
}) {
  return (
    <button
      type="button"
      onClick={() => ubah(!aktif)}
      className="flex w-full items-start gap-3 rounded-lg border border-slate-200 bg-white p-2.5 text-left transition hover:border-slate-300 hover:bg-slate-50"
    >
      <span
        className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition ${
          aktif ? 'bg-merah-500' : 'bg-slate-300'
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${
            aktif ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-slate-800">{judul}</span>
        <span className="block text-[11px] leading-snug text-slate-500">{deskripsi}</span>
      </span>
    </button>
  );
}

const inputKelas =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-merah-500 focus:ring-2 focus:ring-merah-100';

export default function Kontrol({ opsi, ubah, onGenerate, sibuk }: Props) {
  const seedAcak = () =>
    ubah({ seed: `KAI-${Math.random().toString(36).slice(2, 8).toUpperCase()}` });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onGenerate();
      }}
      className="space-y-5"
    >
      {/* ---------------------------------------------------------- jumlah */}
      <section>
        <Label hint="1 paket = 25 soal">Jumlah paket</Label>
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            max={500}
            value={opsi.jumlahPaket}
            onChange={(e) => ubah({ jumlahPaket: Number(e.target.value) })}
            className={inputKelas + ' angka'}
          />
          <div className="flex shrink-0 gap-1">
            {PRESET_PAKET.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => ubah({ jumlahPaket: n })}
                className={`w-10 rounded-lg border px-1 py-2 text-xs font-semibold transition ${
                  opsi.jumlahPaket === n
                    ? 'border-merah-500 bg-merah-50 text-merah-700'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500">
          Total {(opsi.jumlahPaket * 25).toLocaleString('id-ID')} soal. Maksimal 500 paket
          (12.500 soal).
        </p>
      </section>

      {/* ------------------------------------------------------------ seed */}
      <section>
        <Label hint="seed sama = hasil sama persis">Seed acak</Label>
        <div className="flex gap-2">
          <input
            value={opsi.seed}
            onChange={(e) => ubah({ seed: e.target.value })}
            placeholder="KAI-2026"
            className={inputKelas + ' angka'}
          />
          <button
            type="button"
            onClick={seedAcak}
            className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Acak
          </button>
        </div>
      </section>

      {/* -------------------------------------------------------- identitas */}
      <section className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Judul tes</Label>
          <input
            value={opsi.judul}
            onChange={(e) => ubah({ judul: e.target.value })}
            className={inputKelas}
          />
        </div>
        <div>
          <Label>Instansi</Label>
          <input
            value={opsi.instansi}
            onChange={(e) => ubah({ instansi: e.target.value })}
            className={inputKelas}
          />
        </div>
        <div>
          <Label hint="menit">Durasi</Label>
          <input
            type="number"
            min={1}
            max={180}
            value={opsi.durasiMenit}
            onChange={(e) => ubah({ durasiMenit: Number(e.target.value) })}
            className={inputKelas + ' angka'}
          />
        </div>
      </section>

      {/* --------------------------------------------------- bentuk jawaban */}
      <section>
        <Label>Bentuk jawaban</Label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { v: true, t: 'Pilihan ganda' },
            { v: false, t: 'Isian singkat' },
          ].map((o) => (
            <button
              key={String(o.v)}
              type="button"
              onClick={() => ubah({ pilihanGanda: o.v })}
              className={`rounded-lg border px-3 py-2 text-[13px] font-semibold transition ${
                opsi.pilihanGanda === o.v
                  ? 'border-merah-500 bg-merah-50 text-merah-700'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
              }`}
            >
              {o.t}
            </button>
          ))}
        </div>

        {opsi.pilihanGanda ? (
          <div className="mt-2.5 space-y-2 rounded-lg bg-slate-50 p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-slate-600">Jumlah opsi</span>
              <div className="flex gap-1">
                {[4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => ubah({ jumlahOpsi: n })}
                    className={`w-9 rounded-md border py-1 text-xs font-semibold transition ${
                      opsi.jumlahOpsi === n
                        ? 'border-merah-500 bg-white text-merah-700'
                        : 'border-slate-300 bg-white text-slate-500'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <Saklar
              aktif={opsi.urutkanOpsi}
              ubah={(v) => ubah({ urutkanOpsi: v })}
              judul="Urutkan opsi menaik"
              deskripsi="Opsi disusun dari nilai terkecil. Matikan untuk mengacak posisi kunci."
            />
          </div>
        ) : null}
      </section>

      {/* -------------------------------------------------- lambang pembagian */}
      <section>
        <Label hint="dipakai di teks soal & pembahasan">Lambang pembagian</Label>
        <div className="grid grid-cols-2 gap-2">
          {([
            { v: '÷' as const, t: '÷  (seperti mapping)' },
            { v: ':' as const, t: ':  (gaya sekolah)' },
          ]).map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => ubah({ simbolBagi: o.v })}
              className={`angka rounded-lg border px-3 py-2 text-[13px] font-semibold transition ${
                opsi.simbolBagi === o.v
                  ? 'border-merah-500 bg-merah-50 text-merah-700'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
              }`}
            >
              {o.t}
            </button>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------ opsi mapping */}
      <section className="space-y-2">
        <Label hint="mengikuti dokumen mapping">Aturan soal</Label>

        <Saklar
          aktif={opsi.desimal}
          ubah={(v) => ubah({ desimal: v })}
          judul="Izinkan bilangan desimal"
          deskripsi="Hanya pada penjumlahan/pengurangan di Operasi Tunggal & Campuran, sesuai mapping."
        />

        {opsi.desimal ? (
          <div className="rounded-lg bg-slate-50 p-2.5">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[12px] text-slate-600">Kepadatan desimal</span>
              <span className="angka text-[12px] font-semibold text-merah-700">
                {Math.round(opsi.pDesimal * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(opsi.pDesimal * 100)}
              onChange={(e) => ubah({ pDesimal: Number(e.target.value) / 100 })}
              className="w-full"
            />
          </div>
        ) : null}

        <Saklar
          aktif={opsi.ketat}
          ubah={(v) => ubah({ ketat: v })}
          judul="Mode ketat"
          deskripsi="Hanya memakai bentuk soal yang tertulis persis di dokumen mapping, tanpa variasi setara."
        />
        <Saklar
          aktif={opsi.variasiMerata}
          ubah={(v) => ubah({ variasiMerata: v })}
          judul="Sebarkan variasi"
          deskripsi="Menghindari satu blok memakai bentuk yang itu-itu saja. Urutan kategori tetap tidak berubah."
        />
        <Saklar
          aktif={opsi.hindariNegatif}
          ubah={(v) => ubah({ hindariNegatif: v })}
          judul="Hindari hasil negatif"
          deskripsi="Menolak soal yang hasil antara atau hasil akhirnya di bawah nol."
        />
      </section>

      <button
        type="submit"
        disabled={sibuk}
        className="w-full rounded-xl bg-merah-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-merah-600 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {sibuk ? 'Sedang membuat soal...' : `Generate ${opsi.jumlahPaket} paket`}
      </button>
    </form>
  );
}
