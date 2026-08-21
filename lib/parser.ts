/**
 * Parser independen untuk teks soal.
 *
 * Dipakai HANYA oleh validator: teks soal yang sudah di-render di-parse ulang
 * dari nol lalu dihitung. Kalau hasilnya sama dengan kunci jawaban yang
 * tersimpan, berarti render + kunci jawaban benar-benar konsisten.
 */

import { r6 } from './num';

type Tok =
  | { k: 'num'; v: number }
  | { k: 'op'; v: '+' | '-' | '×' | '÷' }
  | { k: '(' }
  | { k: ')' };

// ':' diterima sebagai lambang pembagian selain '÷'
const OPS = '+-×÷:';

/** "1.234,5" -> 1234.5 */
function parseAngka(s: string): number {
  return Number(s.replace(/\./g, '').replace(',', '.'));
}

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === ' ' || ch === '\t' || ch === '\n') { i++; continue; }
    if (ch === '(') { out.push({ k: '(' }); i++; continue; }
    if (ch === ')') { out.push({ k: ')' }); i++; continue; }
    if (OPS.includes(ch)) {
      out.push({ k: 'op', v: (ch === ':' ? '÷' : ch) as '+' });
      i++;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < src.length && /[0-9.,]/.test(src[j])) j++;
      const raw = src.slice(i, j);
      const v = parseAngka(raw);
      if (!Number.isFinite(v)) throw new Error(`angka tidak valid: "${raw}"`);
      out.push({ k: 'num', v });
      i = j;
      continue;
    }
    throw new Error(`karakter tidak dikenal: "${ch}"`);
  }
  return out;
}

/**
 * Recursive descent dengan prioritas operasi standar:
 * ekspresi := suku (('+' | '-') suku)*
 * suku     := faktor (('×' | '÷') faktor)*
 * faktor   := angka | '(' ekspresi ')'
 */
export function hitungTeks(src: string): number {
  const toks = tokenize(src);
  let pos = 0;

  const peek = () => toks[pos];

  function faktor(): number {
    const t = peek();
    if (!t) throw new Error('ekspresi terpotong');
    if (t.k === 'num') { pos++; return t.v; }
    if (t.k === '(') {
      pos++;
      const v = ekspresi();
      const close = peek();
      if (!close || close.k !== ')') throw new Error('kurung tutup hilang');
      pos++;
      return v;
    }
    throw new Error('faktor tidak valid');
  }

  function suku(): number {
    let v = faktor();
    for (;;) {
      const t = peek();
      if (t && t.k === 'op' && (t.v === '×' || t.v === '÷')) {
        pos++;
        const rhs = faktor();
        if (t.v === '÷' && rhs === 0) throw new Error('pembagian dengan nol');
        v = r6(t.v === '×' ? v * rhs : v / rhs);
      } else return v;
    }
  }

  function ekspresi(): number {
    let v = suku();
    for (;;) {
      const t = peek();
      if (t && t.k === 'op' && (t.v === '+' || t.v === '-')) {
        pos++;
        const rhs = suku();
        v = r6(t.v === '+' ? v + rhs : v - rhs);
      } else return v;
    }
  }

  const hasil = ekspresi();
  if (pos !== toks.length) throw new Error('ada token tersisa setelah ekspresi');
  return hasil;
}
