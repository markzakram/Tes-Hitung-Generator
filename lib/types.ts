import type { BlokId, Kategori, Tingkat } from './mapping';
import type { BarisPembahasan } from './pembahasan';

export type Soal = {
  /** nomor 1..25 sesuai urutan mapping (tidak diacak antarkategori) */
  no: number;
  kategori: Kategori;
  tingkat: Tingkat;
  blok: BlokId;
  subkategori: string;
  polaId: string;
  /** bentuk simbolik pola, mis. "a x b + c" */
  bentuk: string;
  /** teks soal siap cetak, mis. "24 × 12" */
  soal: string;
  jawaban: number;
  jawabanTeks: string;
  /** opsi pilihan ganda (teks angka saja), kosong bila mode isian */
  opsi: string[];
  /** huruf kunci: "A".."E", kosong bila mode isian */
  kunci: string;
  /** langkah penyelesaian ringkas, mis. ["(24 + 16) × 5", "40 × 5", "200"] */
  langkah: string[];
  /** pembahasan naratif siap cetak */
  pembahasan: BarisPembahasan[];
  /** soal memuat bilangan desimal */
  desimal: boolean;
};

export type Paket = {
  nomor: number;
  kode: string;
  seed: string;
  soal: Soal[];
};

export type OpsiGenerate = {
  /** jumlah paket yang dibuat (1..500) */
  jumlahPaket: number;
  seed: string;
  /** true = pilihan ganda, false = isian singkat */
  pilihanGanda: boolean;
  /** jumlah opsi pilihan ganda (4 atau 5) */
  jumlahOpsi: number;
  /** urutkan opsi menaik; bila false, opsi diacak */
  urutkanOpsi: boolean;
  /** izinkan bilangan desimal pada blok yang memperbolehkan */
  desimal: boolean;
  /** peluang sebuah suku tambah/kurang menjadi desimal (0..1) */
  pDesimal: number;
  /** hanya pakai bentuk soal yang tertulis persis di dokumen mapping */
  ketat: boolean;
  /** lambang pembagian pada teks soal: '÷' (seperti dokumen mapping) atau ':' */
  simbolBagi: '÷' | ':';
  /** sebar variasi agar satu blok tidak memakai pola yang itu-itu saja */
  variasiMerata: boolean;
  /** tolak hasil antara / akhir yang negatif */
  hindariNegatif: boolean;
  judul: string;
  instansi: string;
  durasiMenit: number;
};

export const DEFAULT_OPSI: OpsiGenerate = {
  jumlahPaket: 10,
  seed: 'KAI-2026',
  pilihanGanda: true,
  jumlahOpsi: 5,
  urutkanOpsi: true,
  desimal: true,
  pDesimal: 0.3,
  ketat: false,
  simbolBagi: '÷',
  variasiMerata: true,
  hindariNegatif: true,
  judul: 'TES HITUNG CEPAT',
  instansi: 'PT KAI',
  durasiMenit: 7,
};

export type Ringkasan = {
  totalPaket: number;
  totalSoal: number;
  perKategori: Record<string, number>;
  perTingkat: Record<string, number>;
  polaTerpakai: number;
  soalDesimal: number;
  soalUnik: number;
  duplikat: number;
};
