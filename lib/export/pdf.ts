/**
 * Ekspor PDF langsung dari browser (tanpa dialog cetak).
 *
 * jsPDF di-import dinamis supaya tidak ikut ke bundle awal halaman.
 * Font standar jsPDF memakai WinAnsi: lambang × dan ÷ aman, tetapi karakter
 * di luar Latin-1 seperti • dan — akan hilang, jadi semua teks dilewatkan
 * `aman()` lebih dahulu.
 */

import type { jsPDF } from 'jspdf';
import { DETIK_PER_SOAL, statusTingkat } from '../mapping';
import { fmt } from '../num';
import type { OpsiGenerate, Paket } from '../types';

const HURUF = ['A', 'B', 'C', 'D', 'E', 'F'];

const HALAMAN = { lebar: 210, tinggi: 297 };
const MARGIN = 12;
const ABU: [number, number, number] = [90, 90, 90];
const HITAM: [number, number, number] = [17, 17, 17];
const AKSEN: [number, number, number] = [176, 62, 11];

/** Ganti karakter yang tidak ada di Latin-1 agar tidak hilang saat dicetak. */
function aman(teks: string): string {
  return teks
    .replace(/[•∙]/g, '-')
    .replace(/[—–]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/→/g, '->')
    .replace(/…/g, '...');
}

type Bagian = {
  isi: string;
  size: number;
  bold?: boolean;
  indent?: number;
  tengah?: boolean;
  warna?: [number, number, number];
  setelah?: number;
};

/**
 * Penata halaman sederhana: menumpuk baris ke bawah, pindah kolom lalu pindah
 * halaman saat penuh. Tinggi tiap blok soal diukur lebih dahulu supaya satu
 * butir tidak pernah terpotong di tengah.
 */
class Lembar {
  y = MARGIN;
  private kolom = 1;
  private kolomIdx = 0;
  private atas = MARGIN;
  private readonly jarak = 8;

  constructor(private doc: jsPDF) {}

  private get lebarKolom() {
    return (HALAMAN.lebar - 2 * MARGIN - (this.kolom - 1) * this.jarak) / this.kolom;
  }

  private get x() {
    return MARGIN + this.kolomIdx * (this.lebarKolom + this.jarak);
  }

  private tinggiBaris(size: number) {
    return size * 0.3528 * 1.3;
  }

  private potong(b: Bagian): string[] {
    this.doc.setFont('helvetica', b.bold ? 'bold' : 'normal');
    this.doc.setFontSize(b.size);
    return this.doc.splitTextToSize(aman(b.isi), this.lebarKolom - (b.indent ?? 0)) as string[];
  }

  halamanBaru() {
    this.doc.addPage();
    this.kolomIdx = 0;
    this.y = MARGIN;
    this.atas = MARGIN;
  }

  /** Mulai bagian berkolom `n`; posisi y saat ini jadi batas atas tiap kolom. */
  mulaiKolom(n: number) {
    this.kolom = n;
    this.kolomIdx = 0;
    this.atas = this.y;
  }

  tinggiBlok(bagian: Bagian[]): number {
    return bagian.reduce(
      (t, b) => t + this.potong(b).length * this.tinggiBaris(b.size) + (b.setelah ?? 0),
      0,
    );
  }

  /** Sediakan ruang setinggi `h`; pindah kolom/halaman kalau tidak muat. */
  ruang(h: number) {
    if (this.y + h <= HALAMAN.tinggi - MARGIN) return;
    if (this.kolomIdx < this.kolom - 1) {
      this.kolomIdx++;
      this.y = this.atas;
    } else {
      this.halamanBaru();
    }
  }

  tulis(bagian: Bagian[]) {
    for (const b of bagian) {
      const baris = this.potong(b);
      const lh = this.tinggiBaris(b.size);
      this.doc.setTextColor(...(b.warna ?? HITAM));
      for (const teks of baris) {
        if (b.tengah) {
          this.doc.text(teks, MARGIN + this.lebarKolom / 2, this.y + lh * 0.78, {
            align: 'center',
          });
        } else {
          this.doc.text(teks, this.x + (b.indent ?? 0), this.y + lh * 0.78);
        }
        this.y += lh;
      }
      this.y += b.setelah ?? 0;
    }
  }

  garis() {
    this.doc.setDrawColor(150);
    this.doc.setLineWidth(0.2);
    this.doc.line(MARGIN, this.y, HALAMAN.lebar - MARGIN, this.y);
    this.y += 3;
  }
}

function kop(l: Lembar, p: Paket, opsi: OpsiGenerate, subjudul?: string) {
  l.tulis([
    { isi: opsi.instansi.toUpperCase(), size: 9, bold: true, tengah: true, warna: ABU },
    {
      isi: subjudul ? `${opsi.judul.toUpperCase()} - ${subjudul}` : opsi.judul.toUpperCase(),
      size: 15,
      bold: true,
      tengah: true,
      setelah: 1,
    },
    {
      isi: `${p.kode}  -  25 Soal  -  ${opsi.durasiMenit} Menit`,
      size: 9,
      tengah: true,
      warna: ABU,
      setelah: 2,
    },
  ]);
}

async function buatDoc() {
  const { jsPDF: J } = await import('jspdf');
  const doc = new J({ unit: 'mm', format: 'a4', compress: true });
  doc.setFont('helvetica', 'normal');
  return doc;
}

function keluaran(doc: jsPDF): Uint8Array {
  return new Uint8Array(doc.output('arraybuffer'));
}

/** Naskah ujian: kop satu kolom, butir soal dua kolom. */
export async function pdfSoal(paketList: Paket[], opsi: OpsiGenerate): Promise<Uint8Array> {
  const doc = await buatDoc();
  const l = new Lembar(doc);

  paketList.forEach((p, i) => {
    if (i > 0) l.halamanBaru();
    l.mulaiKolom(1);
    kop(l, p, opsi);

    const petunjuk = opsi.pilihanGanda
      ? `Kerjakan 25 soal berikut dalam waktu ${opsi.durasiMenit} menit. Pilih satu jawaban yang paling tepat. Rata-rata ${fmt(DETIK_PER_SOAL)} detik per soal.`
      : `Kerjakan 25 soal berikut dalam waktu ${opsi.durasiMenit} menit. Tulis hasil hitungan pada titik-titik. Rata-rata ${fmt(DETIK_PER_SOAL)} detik per soal.`;

    l.tulis([
      { isi: `Petunjuk: ${petunjuk}`, size: 8.5, setelah: 1 },
      {
        isi: 'Nama: ......................................................    No. Peserta: ..............................',
        size: 8.5,
        setelah: 2,
      },
    ]);
    l.garis();

    l.mulaiKolom(2);
    for (const s of p.soal) {
      const bagian: Bagian[] = [{ isi: `${s.no}. ${s.soal} = ...`, size: 10.5, setelah: 0.4 }];
      if (opsi.pilihanGanda) {
        bagian.push({
          isi: s.opsi.map((o, k) => `${HURUF[k]}. ${o}`).join('   '),
          size: 9,
          indent: 5,
          warna: [60, 60, 60],
        });
      }
      if (opsi.kunciDiBawahOpsi) {
        bagian.push({
          isi: `Jawaban: ${opsi.pilihanGanda ? s.kunci : s.jawabanTeks}`,
          size: 9,
          bold: true,
          indent: 5,
          warna: AKSEN,
        });
      }
      bagian[bagian.length - 1].setelah = 2;
      l.ruang(l.tinggiBlok(bagian));
      l.tulis(bagian);
    }
  });

  return keluaran(doc);
}

/** Naskah lengkap: nomor soal, soal, opsi, jawaban, lalu pembahasan. */
export async function pdfPembahasan(paketList: Paket[], opsi: OpsiGenerate): Promise<Uint8Array> {
  const doc = await buatDoc();
  const l = new Lembar(doc);

  paketList.forEach((p, i) => {
    if (i > 0) l.halamanBaru();
    l.mulaiKolom(1);
    kop(l, p, opsi, 'SOAL DAN PEMBAHASAN');
    l.garis();

    for (const s of p.soal) {
      const bagian: Bagian[] = [
        { isi: `Soal ${s.no}`, size: 11, bold: true, setelah: 0.4 },
      ];

      if (opsi.tampilkanTingkat) {
        bagian.push({
          isi: `Tingkat Kesulitan: ${statusTingkat(s.tingkat)}`,
          size: 9,
          warna: ABU,
          setelah: 0.8,
        });
      }

      bagian.push({ isi: `${s.soal} = ...`, size: 11.5, indent: 5, setelah: 1 });

      if (opsi.pilihanGanda) {
        for (const [k, o] of s.opsi.entries()) {
          bagian.push({ isi: `${HURUF[k]}. ${o}`, size: 10, indent: 5 });
        }
        bagian[bagian.length - 1].setelah = 1.5;
      }

      bagian.push(
        {
          isi: `Jawaban: ${opsi.pilihanGanda ? s.kunci : s.jawabanTeks}`,
          size: 10,
          bold: true,
          warna: AKSEN,
        },
        { isi: 'Pembahasan:', size: 10, bold: true, setelah: 0.4 },
      );

      for (const b of s.pembahasan) {
        bagian.push({
          isi: b.isi,
          size: 10,
          indent: b.jenis === 'hitung' ? 5 : 0,
          bold: b.jenis === 'hitung',
          warna: b.jenis === 'hitung' ? HITAM : [70, 70, 70],
        });
      }
      bagian[bagian.length - 1].setelah = 4;

      l.ruang(l.tinggiBlok(bagian));
      l.tulis(bagian);
    }
  });

  return keluaran(doc);
}

/** Lembar kunci ringkas: grid 5 × 5 per paket. */
export async function pdfKunci(paketList: Paket[], opsi: OpsiGenerate): Promise<Uint8Array> {
  const doc = await buatDoc();
  const l = new Lembar(doc);

  l.mulaiKolom(1);
  l.tulis([
    { isi: 'KUNCI JAWABAN', size: 15, bold: true, tengah: true, setelah: 1 },
    {
      isi: `${opsi.judul} - ${opsi.instansi}  -  ${paketList.length} paket  -  seed: ${opsi.seed}`,
      size: 9,
      tengah: true,
      warna: ABU,
      setelah: 3,
    },
  ]);

  const lebarSel = (HALAMAN.lebar - 2 * MARGIN) / 5;
  const tinggiSel = 6;

  for (const p of paketList) {
    l.ruang(6 + tinggiSel * 5 + 4);
    l.tulis([{ isi: p.kode, size: 10, bold: true, setelah: 1 }]);

    doc.setDrawColor(190);
    doc.setLineWidth(0.2);
    doc.setFontSize(9);
    const y0 = l.y;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const s = p.soal[r * 5 + c];
        const x = MARGIN + c * lebarSel;
        const y = y0 + r * tinggiSel;
        doc.rect(x, y, lebarSel, tinggiSel);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...HITAM);
        doc.text(`${s.no}.`, x + 1.6, y + 4.1);
        doc.setFont('helvetica', 'bold');
        doc.text(aman(opsi.pilihanGanda ? s.kunci : s.jawabanTeks), x + 8, y + 4.1);
      }
    }
    l.y = y0 + tinggiSel * 5 + 4;
  }

  return keluaran(doc);
}
