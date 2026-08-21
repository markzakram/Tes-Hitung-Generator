'use client';

import { useState } from 'react';

import type { TipeCetak } from '@/components/LembarCetak';
import { csvKunci, csvSoal } from '@/lib/export/csv';
import {
  berkasPerPaket,
  buatZip,
  dokumenGabungan,
  namaAman,
  type FormatBerkas,
  type IsiBerkas,
} from '@/lib/export/berkas';
import type { OpsiGenerate, Paket, Ringkasan } from '@/lib/types';

function unduhBlob(nama: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nama;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const tombol =
  'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

const tombolUtama =
  'rounded-lg bg-slate-900 px-4 py-2 text-[12.5px] font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50';

function Judul({ children, catatan }: { children: React.ReactNode; catatan?: string }) {
  return (
    <div className="mb-2 flex items-baseline gap-2">
      <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{children}</h3>
      {catatan ? <span className="text-[11px] text-slate-400">{catatan}</span> : null}
    </div>
  );
}

function Pilihan<T extends string>({
  nilai,
  ubah,
  daftar,
}: {
  nilai: T;
  ubah: (v: T) => void;
  daftar: { v: T; t: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {daftar.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => ubah(o.v)}
          className={`rounded-md border px-2.5 py-1.5 text-[12px] font-semibold transition ${
            nilai === o.v
              ? 'border-merah-500 bg-merah-50 text-merah-700'
              : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
          }`}
        >
          {o.t}
        </button>
      ))}
    </div>
  );
}

export default function PanelEkspor({
  paket,
  opsi,
  ringkasan,
  kunciInline,
  setKunciInline,
  onCetak,
  onGalat,
}: {
  paket: Paket[];
  opsi: OpsiGenerate;
  ringkasan: Ringkasan;
  kunciInline: boolean;
  setKunciInline: (v: boolean) => void;
  onCetak: (tipe: TipeCetak, semua: boolean) => void;
  onGalat: (pesan: string) => void;
}) {
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [kemajuan, setKemajuan] = useState<{ selesai: number; total: number } | null>(null);
  const [zipIsi, setZipIsi] = useState<IsiBerkas>('pembahasan');
  const [zipFormat, setZipFormat] = useState<FormatBerkas>('docx');

  const opsiEkspor: OpsiGenerate = { ...opsi, kunciDiBawahOpsi: kunciInline };
  const dasar = `${namaAman(opsi.judul)}-${namaAman(opsi.seed)}-${paket.length}paket`;

  const jalankan = async (kunci: string, fn: () => Promise<void> | void) => {
    setSibuk(kunci);
    try {
      await fn();
    } catch (e) {
      onGalat(e instanceof Error ? e.message : String(e));
    } finally {
      setSibuk(null);
      setKemajuan(null);
    }
  };

  const unduhGabungan = (isi: IsiBerkas, format: FormatBerkas) =>
    jalankan(`${isi}-${format}`, async () => {
      const data = await dokumenGabungan(isi, paket, opsiEkspor, format);
      unduhBlob(
        `${namaAman(isi)}-${dasar}.${format}`,
        new Blob([data as unknown as BlobPart], {
          type:
            format === 'pdf'
              ? 'application/pdf'
              : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
      );
    });

  const unduhZip = () =>
    jalankan('zip', async () => {
      setKemajuan({ selesai: 0, total: paket.length });
      const berkas = await berkasPerPaket(zipIsi, paket, opsiEkspor, zipFormat, (selesai, total) =>
        setKemajuan({ selesai, total }),
      );
      const zip = await buatZip(berkas);
      unduhBlob(
        `${namaAman(zipIsi)}-${zipFormat}-${dasar}.zip`,
        new Blob([zip as unknown as BlobPart], { type: 'application/zip' }),
      );
    });

  const unduhTeks = (nama: string, isi: string, tipe: string) =>
    jalankan(nama, () =>
      unduhBlob(`${nama}-${dasar}`, new Blob([isi], { type: `${tipe};charset=utf-8` })),
    );

  const label = (kunci: string, teks: string) => (sibuk === kunci ? 'Menyiapkan...' : teks);

  const DOKUMEN: { isi: IsiBerkas; nama: string }[] = [
    { isi: 'pembahasan', nama: 'Soal + jawaban + pembahasan' },
    { isi: 'soal', nama: 'Naskah soal' },
    { isi: 'kunci', nama: 'Kunci jawaban' },
  ];

  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* ------------------------------------------------ satu berkas gabungan */}
      <div>
        <Judul catatan={`${paket.length} paket jadi satu berkas`}>Unduh gabungan</Judul>
        <div className="space-y-1.5">
          {DOKUMEN.map((d) => (
            <div
              key={d.isi}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"
            >
              <span className="text-[12.5px] font-semibold text-slate-700">{d.nama}</span>
              <span className="flex gap-1.5">
                <button
                  className={tombol}
                  disabled={!!sibuk}
                  onClick={() => unduhGabungan(d.isi, 'docx')}
                >
                  {label(`${d.isi}-docx`, 'Word')}
                </button>
                <button
                  className={tombol}
                  disabled={!!sibuk}
                  onClick={() => unduhGabungan(d.isi, 'pdf')}
                >
                  {label(`${d.isi}-pdf`, 'PDF')}
                </button>
              </span>
            </div>
          ))}
        </div>

        {opsi.pilihanGanda ? (
          <label className="mt-2 flex cursor-pointer items-start gap-2 px-1 text-[12px] text-slate-700">
            <input
              type="checkbox"
              checked={kunciInline}
              onChange={(e) => setKunciInline(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-merah-500"
            />
            <span>
              <span className="font-semibold">Kunci tepat di bawah opsi</span>
              <span className="block text-[11px] leading-snug text-slate-500">
                Berlaku untuk &quot;Naskah soal&quot; dan cetakannya. Matikan untuk naskah yang
                dibagikan ke peserta.
              </span>
            </span>
          </label>
        ) : null}
      </div>

      {/* ------------------------------------------------------ zip per paket */}
      <div className="rounded-lg border border-slate-200 p-3">
        <Judul catatan={`${paket.length} berkas terpisah`}>Unduh per paket (.zip)</Judul>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-14 shrink-0 text-[11.5px] text-slate-500">Isi</span>
            <Pilihan
              nilai={zipIsi}
              ubah={setZipIsi}
              daftar={[
                { v: 'pembahasan' as IsiBerkas, t: 'Soal + pembahasan' },
                { v: 'soal' as IsiBerkas, t: 'Naskah soal' },
                { v: 'kunci' as IsiBerkas, t: 'Kunci jawaban' },
              ]}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-14 shrink-0 text-[11.5px] text-slate-500">Format</span>
            <Pilihan
              nilai={zipFormat}
              ubah={setZipFormat}
              daftar={[
                { v: 'docx' as FormatBerkas, t: 'Word (.docx)' },
                { v: 'pdf' as FormatBerkas, t: 'PDF' },
              ]}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button className={tombolUtama} disabled={!!sibuk} onClick={unduhZip}>
            {sibuk === 'zip'
              ? kemajuan
                ? `Membuat ${kemajuan.selesai}/${kemajuan.total}...`
                : 'Membungkus...'
              : `Unduh ${paket.length} berkas (.zip)`}
          </button>
          {kemajuan ? (
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-merah-500 transition-all"
                style={{ width: `${(kemajuan.selesai / Math.max(1, kemajuan.total)) * 100}%` }}
              />
            </div>
          ) : (
            <span className="text-[11px] text-slate-500">
              Tiap paket jadi satu berkas sendiri, mis. <span className="angka">PAKET-01</span>,{' '}
              <span className="angka">PAKET-02</span>, ...
            </span>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- cetak */}
      <div>
        <Judul catatan="pilih tujuan Save as PDF untuk menyimpan">Cetak</Judul>
        <div className="flex flex-wrap gap-1.5">
          <button className={tombol} onClick={() => onCetak('soal', false)}>
            Soal paket ini
          </button>
          <button className={tombol} onClick={() => onCetak('soal', true)}>
            Soal semua paket
          </button>
          <button className={tombol} onClick={() => onCetak('pembahasan', false)}>
            Pembahasan paket ini
          </button>
          <button className={tombol} onClick={() => onCetak('pembahasan', true)}>
            Pembahasan semua paket
          </button>
          <button className={tombol} onClick={() => onCetak('kunci', true)}>
            Lembar kunci
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------- data */}
      <div>
        <Judul catatan={`${ringkasan.totalSoal.toLocaleString('id-ID')} baris`}>Data mentah</Judul>
        <div className="flex flex-wrap gap-1.5">
          <button
            className={tombol}
            disabled={!!sibuk}
            onClick={() => unduhTeks('soal.csv', csvSoal(paket, opsi), 'text/csv')}
          >
            Soal (.csv)
          </button>
          <button
            className={tombol}
            disabled={!!sibuk}
            onClick={() => unduhTeks('kunci.csv', csvKunci(paket, opsi), 'text/csv')}
          >
            Kunci (.csv)
          </button>
          <button
            className={tombol}
            disabled={!!sibuk}
            onClick={() =>
              unduhTeks(
                'data.json',
                JSON.stringify({ opsi, ringkasan, paket }, null, 2),
                'application/json',
              )
            }
          >
            Semua data (.json)
          </button>
        </div>
      </div>
    </section>
  );
}
