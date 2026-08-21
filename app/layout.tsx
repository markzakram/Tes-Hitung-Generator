import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Generator Soal Tes Hitung Cepat',
  description:
    'Membuat paket soal tes hitung cepat 25 soal / 7 menit sesuai mapping: Operasi Tunggal, Campuran, dan Bertingkat.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
