/**
 * Ekspor Word (.docx).
 *
 * Pustaka `docx` di-import secara dinamis supaya tidak ikut terbawa ke
 * bundle awal halaman; berkas baru dimuat saat tombol unduh ditekan.
 *
 * Tiap paket memakai dua section: satu kolom untuk kop soal, lalu section
 * bersambung dua kolom untuk 25 butir soalnya - cara standar Word untuk
 * layout campuran satu/dua kolom.
 */

import type { Document } from 'docx';
import { DETIK_PER_SOAL } from '../mapping';
import { fmt } from '../num';
import type { OpsiGenerate, Paket } from '../types';

const HURUF = ['A', 'B', 'C', 'D', 'E', 'F'];

const A4 = { width: 11906, height: 16838 };
const MARGIN = { top: 850, right: 850, bottom: 850, left: 850 };

function instruksi(opsi: OpsiGenerate): string {
  return opsi.pilihanGanda
    ? `Kerjakan ${25} soal berikut dalam waktu ${opsi.durasiMenit} menit. ` +
        `Pilih satu jawaban yang paling tepat. Rata-rata ${fmt(DETIK_PER_SOAL)} detik per soal - ` +
        `kerjakan yang mudah lebih dulu.`
    : `Kerjakan ${25} soal berikut dalam waktu ${opsi.durasiMenit} menit. ` +
        `Tulis hasil hitungan pada kolom jawaban. Rata-rata ${fmt(DETIK_PER_SOAL)} detik per soal.`;
}

export async function docxSoal(paketList: Paket[], opsi: OpsiGenerate): Promise<Document> {
  const d = await import('docx');
  const { Document: Doc, Paragraph, TextRun, AlignmentType, SectionType, BorderStyle } = d;

  const garis = () =>
    new Paragraph({
      text: '',
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '888888', space: 1 } },
      spacing: { after: 160 },
    });

  const sections = paketList.flatMap((p, i) => [
    {
      properties: {
        type: i === 0 ? SectionType.CONTINUOUS : SectionType.NEXT_PAGE,
        page: { size: A4, margin: MARGIN },
        column: { count: 1 },
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: opsi.instansi.toUpperCase(), bold: true, size: 20 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: opsi.judul.toUpperCase(), bold: true, size: 30 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: `${p.kode}  •  25 Soal  •  ${opsi.durasiMenit} Menit`,
              size: 20,
              color: '444444',
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({ text: 'Petunjuk: ', bold: true, size: 18 }),
            new TextRun({ text: instruksi(opsi), size: 18 }),
          ],
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: 'Nama: ..................................................     ', size: 18 }),
            new TextRun({ text: 'No. Peserta: ..................................', size: 18 }),
          ],
        }),
        garis(),
      ],
    },
    {
      properties: {
        type: SectionType.CONTINUOUS,
        page: { size: A4, margin: MARGIN },
        column: { count: 2, space: 400, equalWidth: true },
      },
      children: p.soal.flatMap((s) => {
        const baris = [
          new Paragraph({
            spacing: { after: opsi.pilihanGanda ? 20 : 200 },
            children: [
              new TextRun({ text: `${s.no}. `, bold: true, size: 20 }),
              new TextRun({ text: `${s.soal} = ...`, size: 20 }),
            ],
          }),
        ];
        if (opsi.pilihanGanda) {
          baris.push(
            new Paragraph({
              spacing: { after: 140 },
              indent: { left: 260 },
              children: [
                new TextRun({
                  text: s.opsi.map((o, i) => `${HURUF[i]}. ${o}`).join('    '),
                  size: 18,
                }),
              ],
            }),
          );
        }
        return baris;
      }),
    },
  ]);

  return new Doc({
    creator: 'Generator Tes Hitung Cepat',
    title: `${opsi.judul} - ${paketList.length} paket`,
    description: `Dibuat dari mapping ${opsi.judul} ${opsi.instansi}. Seed: ${opsi.seed}`,
    styles: { default: { document: { run: { font: 'Arial', size: 20 } } } },
    sections,
  });
}

/**
 * Naskah lengkap: nomor soal, soal, opsi, jawaban, lalu pembahasan.
 * Ini format yang dipakai untuk bank soal / dokumen pegangan pengajar.
 */
export async function docxPembahasan(paketList: Paket[], opsi: OpsiGenerate): Promise<Document> {
  const d = await import('docx');
  const { Document: Doc, Paragraph, TextRun, AlignmentType, SectionType, BorderStyle } = d;

  const sections = paketList.map((p, i) => {
    const children = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [new TextRun({ text: opsi.instansi.toUpperCase(), bold: true, size: 20 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [
          new TextRun({ text: `${opsi.judul.toUpperCase()} — SOAL DAN PEMBAHASAN`, bold: true, size: 26 }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '888888', space: 6 } },
        children: [
          new TextRun({
            text: `${p.kode}  •  25 Soal  •  ${opsi.durasiMenit} Menit  •  seed: ${p.seed}`,
            size: 18,
            color: '444444',
          }),
        ],
      }),
    ];

    for (const s of p.soal) {
      children.push(
        new Paragraph({
          spacing: { before: 240, after: 60 },
          children: [new TextRun({ text: `Soal ${s.no}`, bold: true, size: 22 })],
        }),
        new Paragraph({
          spacing: { after: 100 },
          indent: { left: 280 },
          children: [new TextRun({ text: `${s.soal} = ...`, size: 24 })],
        }),
      );

      if (opsi.pilihanGanda) {
        s.opsi.forEach((o, k) => {
          children.push(
            new Paragraph({
              spacing: { after: 20 },
              indent: { left: 280 },
              children: [new TextRun({ text: `${HURUF[k]}. ${o}`, size: 20 })],
            }),
          );
        });
      }

      children.push(
        new Paragraph({
          spacing: { before: 140, after: 40 },
          children: [
            new TextRun({ text: 'Jawaban: ', bold: true, size: 20 }),
            new TextRun({
              text: opsi.pilihanGanda ? s.kunci : s.jawabanTeks,
              bold: true,
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: 'Pembahasan:', bold: true, size: 20 })],
        }),
      );

      for (const b of s.pembahasan) {
        children.push(
          new Paragraph({
            spacing: { after: 40 },
            indent: { left: b.jenis === 'hitung' ? 280 : 0 },
            children: [
              new TextRun({
                text: b.isi,
                size: 20,
                color: b.jenis === 'hitung' ? '1a1a1a' : '333333',
              }),
            ],
          }),
        );
      }
    }

    return {
      properties: {
        type: i === 0 ? SectionType.CONTINUOUS : SectionType.NEXT_PAGE,
        page: { size: A4, margin: MARGIN },
      },
      children,
    };
  });

  return new Doc({
    creator: 'Generator Tes Hitung Cepat',
    title: `${opsi.judul} - soal & pembahasan (${paketList.length} paket)`,
    description: `Dibuat dari mapping ${opsi.judul} ${opsi.instansi}. Seed: ${opsi.seed}`,
    styles: { default: { document: { run: { font: 'Arial', size: 20 } } } },
    sections,
  });
}

export async function docxKunci(
  paketList: Paket[],
  opsi: OpsiGenerate,
  sertakanLangkah = false,
): Promise<Document> {
  const d = await import('docx');
  const {
    Document: Doc,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    AlignmentType,
    WidthType,
    BorderStyle,
  } = d;

  const tepi = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: 'BBBBBB',
  };
  const semuaTepi = { top: tepi, bottom: tepi, left: tepi, right: tepi };

  const children: Array<InstanceType<typeof Paragraph> | InstanceType<typeof Table>> = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: 'KUNCI JAWABAN', bold: true, size: 30 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: `${opsi.judul} - ${opsi.instansi}  •  ${paketList.length} paket  •  seed: ${opsi.seed}`,
          size: 18,
          color: '444444',
        }),
      ],
    }),
  ];

  for (const p of paketList) {
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 80 },
        children: [new TextRun({ text: p.kode, bold: true, size: 22 })],
      }),
    );

    // grid 5 x 5: "1. C"
    const rows = Array.from({ length: 5 }, (_, r) => {
      const cells = Array.from({ length: 5 }, (_, c) => {
        const s = p.soal[r * 5 + c];
        const isi = opsi.pilihanGanda ? `${s.no}. ${s.kunci}` : `${s.no}. ${s.jawabanTeks}`;
        return new TableCell({
          borders: semuaTepi,
          width: { size: 20, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: isi, size: 18 })] })],
        });
      });
      return new TableRow({ children: cells });
    });

    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));

    if (sertakanLangkah) {
      for (const s of p.soal) {
        children.push(
          new Paragraph({
            spacing: { before: 40 },
            indent: { left: 200 },
            children: [
              new TextRun({ text: `${s.no}. `, bold: true, size: 16 }),
              new TextRun({
                text: s.pembahasan
                  .filter((b) => b.jenis === 'hitung')
                  .map((b) => b.isi)
                  .join('   ->   '),
                size: 16,
                color: '333333',
              }),
            ],
          }),
        );
      }
    }
  }

  return new Doc({
    creator: 'Generator Tes Hitung Cepat',
    title: `Kunci Jawaban - ${opsi.judul}`,
    styles: { default: { document: { run: { font: 'Arial', size: 20 } } } },
    sections: [
      {
        properties: { page: { size: A4, margin: MARGIN } },
        children,
      },
    ],
  });
}
