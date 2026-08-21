'use client';

import { DETIK_PER_SOAL, statusTingkat } from '@/lib/mapping';
import { fmt } from '@/lib/num';
import type { OpsiGenerate, Paket } from '@/lib/types';

const HURUF = ['A', 'B', 'C', 'D', 'E', 'F'];

export type TipeCetak = 'soal' | 'kunci' | 'keduanya' | 'pembahasan';

/**
 * Tata letak khusus cetak / simpan-sebagai-PDF.
 * Disembunyikan di layar (`hanya-cetak`) dan baru muncul saat dicetak.
 */
export default function LembarCetak({
  paketList,
  opsi,
  tipe,
}: {
  paketList: Paket[];
  opsi: OpsiGenerate;
  tipe: TipeCetak;
}) {
  const adaSoal = tipe === 'soal' || tipe === 'keduanya';
  const adaKunci = tipe === 'kunci' || tipe === 'keduanya';
  const adaPembahasan = tipe === 'pembahasan';

  return (
    <div className="hanya-cetak">
      {adaPembahasan &&
        paketList.map((p) => (
          <div key={p.kode} className="lembar">
            <header style={{ textAlign: 'center', marginBottom: '5mm' }}>
              <div style={{ fontSize: '9pt', fontWeight: 700, letterSpacing: '0.08em' }}>
                {opsi.instansi.toUpperCase()}
              </div>
              <div style={{ fontSize: '14pt', fontWeight: 700, margin: '1mm 0' }}>
                {opsi.judul.toUpperCase()} — SOAL DAN PEMBAHASAN
              </div>
              <div style={{ fontSize: '9pt' }}>
                {p.kode} &nbsp;•&nbsp; 25 Soal &nbsp;•&nbsp; {opsi.durasiMenit} Menit
                &nbsp;•&nbsp; seed: {p.seed}
              </div>
              <hr style={{ border: 0, borderTop: '1px solid #999', marginTop: '3mm' }} />
            </header>

            {p.soal.map((s) => (
              <div className="butir" key={s.no} style={{ marginBottom: '5mm' }}>
                <div style={{ fontSize: '11pt', fontWeight: 700, marginBottom: '0.6mm' }}>
                  Soal {s.no}
                </div>
                {opsi.tampilkanTingkat ? (
                  <div style={{ fontSize: '9pt', color: '#555', marginBottom: '1.2mm' }}>
                    <strong>Tingkat Kesulitan:</strong> {statusTingkat(s.tingkat)}
                  </div>
                ) : null}
                <div
                  className="angka"
                  style={{ fontSize: '12pt', paddingLeft: '5mm', marginBottom: '1.5mm' }}
                >
                  {s.soal} = ...
                </div>
                {opsi.pilihanGanda
                  ? s.opsi.map((o, i) => (
                      <div
                        key={i}
                        className="angka"
                        style={{ fontSize: '10pt', paddingLeft: '5mm' }}
                      >
                        {HURUF[i]}. {o}
                      </div>
                    ))
                  : null}
                <div style={{ fontSize: '10pt', fontWeight: 700, marginTop: '2mm' }}>
                  Jawaban: {opsi.pilihanGanda ? s.kunci : s.jawabanTeks}
                </div>
                <div style={{ fontSize: '10pt', fontWeight: 700 }}>Pembahasan:</div>
                {s.pembahasan.map((b, i) => (
                  <div
                    key={i}
                    className={b.jenis === 'hitung' ? 'angka' : undefined}
                    style={{
                      fontSize: '10pt',
                      paddingLeft: b.jenis === 'hitung' ? '5mm' : 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {b.isi}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}

      {adaSoal &&
        paketList.map((p) => (
          <div key={p.kode} className="lembar">
            <header style={{ textAlign: 'center', marginBottom: '4mm' }}>
              <div style={{ fontSize: '9pt', fontWeight: 700, letterSpacing: '0.08em' }}>
                {opsi.instansi.toUpperCase()}
              </div>
              <div style={{ fontSize: '15pt', fontWeight: 700, margin: '1mm 0' }}>
                {opsi.judul.toUpperCase()}
              </div>
              <div style={{ fontSize: '9.5pt' }}>
                {p.kode} &nbsp;•&nbsp; 25 Soal &nbsp;•&nbsp; {opsi.durasiMenit} Menit
              </div>
            </header>

            <div style={{ fontSize: '8.5pt', lineHeight: 1.5, marginBottom: '2mm' }}>
              <strong>Petunjuk:</strong>{' '}
              {opsi.pilihanGanda
                ? `Kerjakan 25 soal berikut dalam waktu ${opsi.durasiMenit} menit. Pilih satu jawaban yang paling tepat.`
                : `Kerjakan 25 soal berikut dalam waktu ${opsi.durasiMenit} menit. Tulis hasil hitungan pada titik-titik.`}{' '}
              Rata-rata {fmt(DETIK_PER_SOAL)} detik per soal.
            </div>

            <div style={{ fontSize: '8.5pt', marginBottom: '3mm' }}>
              Nama: ...................................................... &nbsp;&nbsp; No. Peserta:
              ..............................
            </div>

            <hr style={{ border: 0, borderTop: '1px solid #999', marginBottom: '3mm' }} />

            <ol className="kolom-soal" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {p.soal.map((s) => (
                <li className="butir" key={s.no} style={{ marginBottom: '2.6mm' }}>
                  <div style={{ fontSize: '10.5pt' }}>
                    <strong>{s.no}.</strong> <span className="angka">{s.soal} = ...</span>
                  </div>
                  {opsi.pilihanGanda ? (
                    <div
                      className="angka"
                      style={{ fontSize: '9pt', paddingLeft: '5mm', marginTop: '0.6mm' }}
                    >
                      {s.opsi.map((o, i) => (
                        <span key={i} style={{ marginRight: '3.5mm', whiteSpace: 'nowrap' }}>
                          {HURUF[i]}. {o}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {opsi.kunciDiBawahOpsi ? (
                    <div
                      style={{
                        fontSize: '9pt',
                        paddingLeft: '5mm',
                        marginTop: '0.4mm',
                        fontWeight: 700,
                      }}
                    >
                      Jawaban: {opsi.pilihanGanda ? s.kunci : s.jawabanTeks}
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        ))}

      {adaKunci ? (
        <div className="lembar">
          <header style={{ textAlign: 'center', marginBottom: '5mm' }}>
            <div style={{ fontSize: '15pt', fontWeight: 700 }}>KUNCI JAWABAN</div>
            <div style={{ fontSize: '9pt' }}>
              {opsi.judul} — {opsi.instansi} &nbsp;•&nbsp; {paketList.length} paket &nbsp;•&nbsp;
              seed: {opsi.seed}
            </div>
          </header>

          {paketList.map((p) => (
            <div key={p.kode} className="grid-kunci" style={{ marginBottom: '4mm' }}>
              <div style={{ fontSize: '10pt', fontWeight: 700, marginBottom: '1mm' }}>{p.kode}</div>
              <table
                className="angka"
                style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}
              >
                <tbody>
                  {[0, 1, 2, 3, 4].map((r) => (
                    <tr key={r}>
                      {[0, 1, 2, 3, 4].map((c) => {
                        const s = p.soal[r * 5 + c];
                        return (
                          <td
                            key={c}
                            style={{
                              border: '1px solid #bbb',
                              padding: '1mm 2mm',
                              width: '20%',
                            }}
                          >
                            {s.no}. <strong>{opsi.pilihanGanda ? s.kunci : s.jawabanTeks}</strong>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
