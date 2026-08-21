# Generator Soal Tes Hitung Cepat

Membuat paket soal **Tes Hitung Cepat** (25 soal / 7 menit) yang mengikuti dokumen
*Mapping Hitung Cepat PT KAI*. Satu kali generate bisa menghasilkan sampai **500 paket**
(12.500 soal) sekaligus, lengkap dengan opsi pilihan ganda, kunci jawaban, dan
**pembahasan langkah demi langkah**.

Setiap hasil generate diperiksa ulang oleh validator independen sebelum ditampilkan,
sehingga kesesuaian dengan mapping bukan asumsi tetapi terbukti.

---

## Menjalankan

```bash
npm install
```

```bash
npm run dev
```

Buka http://localhost:3000.

Perintah lain:

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Server pengembangan |
| `npm run build` | Build produksi |
| `npm start` | Menjalankan hasil build |
| `npm run verify` | Audit kepatuhan mapping (8 skenario × 100 paket) |
| `npm run generate` | Generate ke berkas dari terminal |

---

## Mapping yang diikuti

Urutan soal **tidak diacak antarkategori**. Pengacakan hanya terjadi di dalam pool
pada rentang nomor yang sama.

| No. Soal | Kategori | Tingkat | Bentuk |
| --- | --- | --- | --- |
| 1–5 | Operasi Tunggal | Mudah | 1 operasi, tanpa kurung. Tambah/kurang boleh desimal |
| 6–10 | Operasi Campuran | Mudah | 2 operasi, tanpa kurung |
| 11–15 | Operasi Campuran | Sedang | 2–3 operasi, tanpa kurung, memerlukan prioritas operasi |
| 16–20 | Operasi Bertingkat | Sedang | 2–3 operasi, **wajib** bertanda kurung |
| 21–25 | Operasi Bertingkat | Sedang (lebih menantang) | 3–4 operasi, wajib bertanda kurung, beban hitung lebih tinggi |

Distribusi per paket: **10 Mudah / 15 Sedang**; Operasi Tunggal 5, Campuran 10,
Bertingkat 10. Rata-rata 16,8 detik per soal.

Keterangan "(lebih menantang)" pada blok 21–25 menjelaskan beban hitungnya, bukan
tingkat kesulitan yang berbeda. Di naskah soal, tingkat kesulitan dicetak sebagai
status saja — **Mudah** atau **Sedang**. Nilai lengkapnya tetap disimpan pada data
dan dipakai validator untuk mencocokkan tiap soal dengan bloknya.

### Pool bentuk soal

`M` = bentuk yang tertulis persis di dokumen mapping. Sisanya variasi setara dengan
jumlah operasi dan beban hitung yang sama, dan hanya aktif kalau **Mode ketat**
dimatikan.

| Blok | Bentuk kanonik (M) | Variasi setara |
| --- | --- | --- |
| 1–5 | `a + b`, `a - b` (bulat/desimal), `a × b`, `a ÷ b` | — |
| 6–10 | `a + b - c`, `a - b + c`, `a × b + c`, `a × b - c`, `a ÷ b + c`, `a ÷ b - c`, `a × b ÷ c` | — |
| 11–15 | `a + b × c - d`, `a - b × c + d`, `a ÷ b + c × d`, `a × b - c ÷ d`, `a ÷ b × c + d` | `a × b + c - d`, `a - b ÷ c + d`, `a + b ÷ c - d` |
| 16–20 | `(a + b) × c`, `a × (b - c)`, `a ÷ (b - c)`, `(a + b) ÷ c + d` | `(a - b) × c`, `a × (b + c)`, `(a + b) ÷ c`, `a ÷ (b + c)` |
| 21–25 | `a × (b - c) + d`, `a ÷ (b + c) × d`, `(a + b) × c - d`, `a ÷ b + c × (d - e)` | `a × (b + c) - d`, `(a - b) × c + d`, `a ÷ (b - c) × d`, `(a + b) ÷ c × d` |

Semua pool ini juga bisa dilihat langsung di aplikasi lewat panel **Acuan mapping**.

### Aturan angka

- Pembagian selalu **habis** (tanpa sisa).
- Hasil antara maupun hasil akhir **tidak pernah negatif** (bisa dimatikan).
- Desimal maksimal **1 angka di belakang koma**, dan hanya boleh menjadi suku
  penjumlahan/pengurangan — tidak pernah dikalikan atau dibagi. Blok Bertingkat
  selalu bilangan bulat.
- Format angka gaya Indonesia: `1.234,5`.

---

## Format hasil unduhan

Dokumen **Soal + jawaban + pembahasan** berisi, untuk setiap butir:

```
Soal 1
Tingkat Kesulitan: Sedang
  (96 : 6) × 12 = ...

  A. 192
  B. 212
  C. 232
  D. 242
  E. 252

Jawaban: A
Pembahasan:
Kerjakan operasi di dalam tanda kurung terlebih dahulu.
  96 : 6 = 16
Kemudian, kalikan hasilnya dengan 12.
  16 × 12 = 192
Jadi, jawaban yang tepat adalah A.
```

Pembahasan disusun dari struktur soalnya sendiri, bukan template tetap: tanda kurung
disebut lebih dahulu, lalu perkalian/pembagian, dan angka yang berasal dari langkah
sebelumnya disebut sebagai "hasilnya" alih-alih diulang sebagai angka lepas.

Berkas yang tersedia:

| Berkas | Isi |
| --- | --- |
| `pembahasan-*.docx` | Soal + opsi + jawaban + pembahasan (format di atas) |
| `soal-*.docx` | Naskah ujian saja, 2 kolom, ganti halaman per paket |
| `soal-berkunci-*.docx` | Naskah yang sama, tetapi `Jawaban: X` menempel tepat di bawah opsi tiap soal |
| `kunci-*.docx` | Kunci ringkas 5×5 per paket |
| `soal-*.csv` | Satu baris per soal, termasuk kolom pembahasan |
| `kunci-*.csv` | Satu baris per paket, 25 kolom jawaban |
| `*.json` | Data mentah lengkap |

Tiga dokumen pertama tersedia dalam **Word (.docx) maupun PDF**. PDF dibuat langsung
di browser, jadi tidak perlu lewat dialog cetak. Tombol **Cetak** tetap ada kalau
ingin menyimpan lewat *Save as PDF* bawaan browser.

### Unduh per paket dalam ZIP

Kalau yang dibutuhkan adalah **satu berkas untuk tiap paket** — misalnya 10 paket jadi
10 berkas — pakai panel **Unduh per paket (.zip)**. Pilih isinya (soal + pembahasan,
naskah soal, atau kunci jawaban) dan formatnya (Word atau PDF), lalu semuanya
dibungkus jadi satu ZIP:

```
pembahasan-pdf-tes-hitung-cepat-kai-2026-10paket.zip
├── PAKET-01-pembahasan.pdf
├── PAKET-02-pembahasan.pdf
└── ... 10 berkas
```

Berkas `.docx` disimpan apa adanya di dalam ZIP karena formatnya sendiri sudah
terkompresi; PDF dipadatkan. Penunjuk kemajuan berjalan per paket, jadi 100 paket pun
tetap terpantau.

---

## Generate dari terminal

```bash
npm run generate -- --paket 100 --seed KAI-2026 --out output
```

| Opsi | Arti |
| --- | --- |
| `--paket <n>` | Jumlah paket (default 10, maksimal 500) |
| `--seed <teks>` | Seed acak (default `KAI-2026`) |
| `--out <folder>` | Folder keluaran (default `output`) |
| `--opsi <4\|5>` | Jumlah opsi pilihan ganda |
| `--judul <teks>` | Judul pada kop soal |
| `--instansi <teks>` | Nama instansi pada kop soal |
| `--durasi <menit>` | Durasi pengerjaan |
| `--simbol-bagi <s>` | `÷` (default) atau `:` |
| `--isian` | Mode isian singkat, bukan pilihan ganda |
| `--ketat` | Hanya bentuk soal yang tertulis di mapping |
| `--tanpa-desimal` | Matikan bilangan desimal |
| `--acak-opsi` | Jangan urutkan opsi menaik |
| `--tanpa-tingkat` | Jangan cantumkan baris "Tingkat Kesulitan" di tiap soal |
| `--langkah` | Sertakan ringkasan langkah di kunci `.docx` |
| `--pdf` | Tulis juga versi PDF dari tiap dokumen |
| `--zip <isi>` | Bungkus satu berkas per paket jadi ZIP (`pembahasan`, `soal`, `berkunci`, `kunci`) |
| `--zip-format <f>` | Format isi ZIP: `docx` (default) atau `pdf` |

```bash
npm run generate -- --paket 10 --zip pembahasan --zip-format pdf
```

Perintah ini menolak menulis berkas kalau ada satu saja soal yang tidak lolos validasi.

---

## API

```
GET  /api/generate?paket=5&seed=KAI-2026
GET  /api/generate?paket=5&format=csv
POST /api/generate      body: { "jumlahPaket": 5, "seed": "KAI-2026", "ketat": true }
```

Balasan JSON memuat `paket`, `ringkasan`, dan `validasi`. Batas API 100 paket per
permintaan; untuk lebih banyak gunakan UI atau CLI.

---

## Seed dan reproduksibilitas

Seed yang sama selalu menghasilkan paket yang sama persis. Seed tiap paket adalah
`<seed>#<nomor>`, jadi `PAKET-07` dari seed `KAI-2026` akan selalu identik walaupun
jumlah paket yang diminta berbeda.

---

## Cara kepatuhan mapping dibuktikan

1. **Dibangun, bukan ditebak.** Soal disusun sebagai pohon ekspresi lalu di-render
   menjadi teks, sehingga kunci jawabannya benar secara konstruksi dan tanda kurung
   muncul persis ketika strukturnya memang memerlukan.
2. **Diperiksa ulang secara independen.** Setelah generate, `lib/validate.ts`
   mem-*parse* ulang teks soal dari nol dengan parser terpisah, menghitung ulang, dan
   membandingkannya dengan kunci yang tersimpan — termasuk setiap baris perhitungan
   di dalam pembahasan.
3. **Dicek terhadap blueprint.** Urutan blok, kategori, tingkat, distribusi
   10 Mudah / 15 Sedang, jumlah operasi, aturan tanda kurung, dan penempatan desimal
   dicocokkan dengan `lib/mapping.ts`.

`npm run verify` menjalankan 8 skenario opsi × 100 paket dan gagal (exit code 1) bila
ada satu temuan pun.

---

## Deploy ke Vercel

Aplikasi ini sudah siap deploy tanpa konfigurasi tambahan: tidak ada database, tidak
ada environment variable, dan generate berjalan di sisi klien.

**Lewat dashboard (paling mudah)**

1. Push folder ini ke GitHub/GitLab/Bitbucket.
   ```bash
   git init && git add -A && git commit -m "Generator soal tes hitung cepat"
   ```
2. Buka [vercel.com/new](https://vercel.com/new), pilih repositorinya.
3. Framework akan terdeteksi sebagai **Next.js**. Biarkan semua setelan default,
   lalu tekan **Deploy**.

**Lewat CLI**

```bash
npx vercel --prod
```

`vercel.json` sudah menyetel region `sin1` (Singapura, paling dekat ke Indonesia) dan
`maxDuration` 60 detik untuk route API.

---

## Struktur

```
app/
  page.tsx              halaman generator
  api/generate/route.ts API JSON/CSV
lib/
  mapping.ts            blueprint 25 soal (sumber kebenaran)
  patterns.ts           pool bentuk soal per blok
  expr.ts               pohon ekspresi: render, hitung, langkah
  pembahasan.ts         penyusun narasi pembahasan
  generate.ts           perakit paket
  validate.ts           validator kepatuhan mapping
  parser.ts             parser independen untuk pemeriksaan silang
  distractors.ts        pembuat opsi pengecoh
  rng.ts                RNG deterministik berbasis seed
  export/               docx, pdf, csv, dan pembungkus ZIP
components/             UI
scripts/
  generate.ts           CLI generate ke berkas
  verify.ts             audit kepatuhan mapping
```

### Sebaran kunci jawaban

Posisi kunci ditentukan **lebih dahulu**, bukan hasil sampingan pengurutan opsi. Tiap
paket mendapat jatah A–E sama banyak (5 masing-masing untuk 25 soal), diacak, lalu
dirapikan agar tidak ada tiga kunci sama berturut-turut. Barulah pengecoh dibagi ke
sisi bawah dan atas jawaban sesuai posisi itu.

Tanpa ini, opsi yang diurutkan menaik membuat jawaban benar hampir selalu mendarat di
C, karena pengecoh terbentuk simetris di sekitar jawaban. Hasil setelah perbaikan,
100 paket = 2.500 soal: **A 500, B 500, C 503, D 503, E 494** — masing-masing 20%.
Selisih tipis muncul kalau jawabannya kecil sehingga tidak cukup angka positif di
bawahnya; posisi kunci digeser seperlunya dan tercatat apa adanya di ringkasan.

### Kenapa pengecohnya masuk akal

Opsi salah tidak diambil acak, melainkan dari kesalahan yang benar-benar sering
terjadi pada tes hitung cepat: menghitung lurus dari kiri ke kanan tanpa memedulikan
prioritas, mengabaikan tanda kurung, dan meleset tipis di salah satu langkah. Sisanya
baru diisi angka di sekitar jawaban.
