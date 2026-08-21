/**
 * Blueprint mapping "TES HITUNG CEPAT PT KAI" - 25 soal / 7 menit.
 * Dituangkan langsung dari dokumen mapping dan menjadi satu-satunya sumber
 * kebenaran, baik untuk generator maupun untuk validator.
 */

export type Kategori = 'Operasi Tunggal' | 'Operasi Campuran' | 'Operasi Bertingkat';
export type Tingkat = 'Mudah' | 'Sedang' | 'Sedang (lebih menantang)';
export type BlokId =
  | 'tunggal-mudah'
  | 'campuran-mudah'
  | 'campuran-sedang'
  | 'bertingkat-sedang'
  | 'bertingkat-menantang';

export type Blok = {
  id: BlokId;
  dari: number;
  sampai: number;
  kategori: Kategori;
  tingkat: Tingkat;
  /** Deskripsi pool persis seperti tertulis di dokumen mapping. */
  pool: string;
  /** Batas jumlah operasi hitung dalam satu soal. */
  minOps: number;
  maxOps: number;
  /** 'wajib' = harus bertanda kurung, 'larang' = tidak boleh bertanda kurung. */
  kurung: 'wajib' | 'larang';
  /** Bilangan desimal boleh muncul pada blok ini. */
  izinDesimal: boolean;
};

export const JUMLAH_SOAL = 25;
export const DURASI_MENIT = 7;
/** 7 menit / 25 soal = 16,8 detik per soal (catatan implementasi mapping). */
export const DETIK_PER_SOAL = (DURASI_MENIT * 60) / JUMLAH_SOAL;

export const BLOK: readonly Blok[] = [
  {
    id: 'tunggal-mudah',
    dari: 1,
    sampai: 5,
    kategori: 'Operasi Tunggal',
    tingkat: 'Mudah',
    pool: 'Penjumlahan; Pengurangan; Perkalian; Pembagian. Penjumlahan/pengurangan dapat berupa bilangan bulat atau desimal.',
    minOps: 1,
    maxOps: 1,
    kurung: 'larang',
    izinDesimal: true,
  },
  {
    id: 'campuran-mudah',
    dari: 6,
    sampai: 10,
    kategori: 'Operasi Campuran',
    tingkat: 'Mudah',
    pool: 'Tambah-Kurang; Kali-Tambah/Kurang; Bagi-Tambah/Kurang; Kali-Bagi. Umumnya 2 operasi dan angka relatif sederhana.',
    minOps: 2,
    maxOps: 2,
    kurung: 'larang',
    izinDesimal: true,
  },
  {
    id: 'campuran-sedang',
    dari: 11,
    sampai: 15,
    kategori: 'Operasi Campuran',
    tingkat: 'Sedang',
    pool: 'Kombinasi 2-3 operasi tanpa tanda kurung; dapat memerlukan prioritas operasi. Desimal dapat muncul terutama pada tambah/kurang.',
    minOps: 2,
    maxOps: 3,
    kurung: 'larang',
    izinDesimal: true,
  },
  {
    id: 'bertingkat-sedang',
    dari: 16,
    sampai: 20,
    kategori: 'Operasi Bertingkat',
    tingkat: 'Sedang',
    pool: 'Tanda kurung sederhana dan prioritas operasi; 2-3 langkah hitung.',
    minOps: 2,
    maxOps: 3,
    kurung: 'wajib',
    izinDesimal: false,
  },
  {
    id: 'bertingkat-menantang',
    dari: 21,
    sampai: 25,
    kategori: 'Operasi Bertingkat',
    tingkat: 'Sedang (lebih menantang)',
    pool: 'Kombinasi 3 operasi dan/atau tanda kurung dengan beban hitung lebih tinggi, tetapi tetap layak untuk tes hitung cepat.',
    minOps: 3,
    maxOps: 4,
    kurung: 'wajib',
    izinDesimal: false,
  },
] as const;

/** Distribusi kategori & kesulitan sesuai tabel pada dokumen mapping. */
export const DISTRIBUSI = {
  'Operasi Tunggal': { Mudah: 5, Sedang: 0, total: 5 },
  'Operasi Campuran': { Mudah: 5, Sedang: 5, total: 10 },
  'Operasi Bertingkat': { Mudah: 0, Sedang: 10, total: 10 },
  TOTAL: { Mudah: 10, Sedang: 15, total: 25 },
} as const;

/**
 * Status kesulitan untuk ditampilkan ke pengguna: cukup "Mudah" atau "Sedang".
 *
 * Blok 21-25 di dokumen mapping tertulis "Sedang (lebih menantang)". Keterangan
 * dalam kurung itu menjelaskan beban hitungnya, bukan tingkat kesulitan yang
 * berbeda, jadi tidak ikut dicetak di naskah soal. Nilai lengkapnya tetap
 * disimpan pada data dan dipakai validator.
 */
export function statusTingkat(tingkat: Tingkat): 'Mudah' | 'Sedang' {
  return tingkat === 'Mudah' ? 'Mudah' : 'Sedang';
}

/** Blok yang memuat nomor soal tertentu (1..25). */
export function blokUntukNomor(no: number): Blok {
  const b = BLOK.find((x) => no >= x.dari && no <= x.sampai);
  if (!b) throw new Error(`Nomor soal di luar mapping: ${no}`);
  return b;
}
