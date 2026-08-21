/**
 * Representasi soal sebagai pohon ekspresi (AST).
 *
 * Soal dibangun sebagai AST lalu di-render menjadi teks, bukan sebaliknya.
 * Dengan begitu jawaban dijamin benar secara konstruksi, dan tanda kurung
 * muncul persis ketika struktur soal memang membutuhkannya.
 */

import { fmt, isClean, r6 } from './num';

export type Op = '+' | '-' | '×' | '÷';

export type Node =
  | { t: 'num'; v: number }
  | { t: 'op'; op: Op; l: Node; r: Node };

export const num = (v: number): Node => ({ t: 'num', v });
export const op = (o: Op, l: Node, r: Node): Node => ({ t: 'op', op: o, l, r });
export const add = (l: Node, r: Node) => op('+', l, r);
export const sub = (l: Node, r: Node) => op('-', l, r);
export const mul = (l: Node, r: Node) => op('×', l, r);
export const div = (l: Node, r: Node) => op('÷', l, r);

const PREC: Record<Op, number> = { '+': 1, '-': 1, '×': 2, '÷': 2 };

export function prec(n: Node): number {
  return n.t === 'num' ? 3 : PREC[n.op];
}

/**
 * Render ke teks. Tanda kurung ditambahkan hanya bila diperlukan agar teks
 * yang dihasilkan mem-parse balik ke pohon yang sama persis.
 */
export function render(n: Node): string {
  if (n.t === 'num') return fmt(n.v);
  const needL = prec(n.l) < prec(n);
  // untuk '-' dan '÷', anak kanan berprioritas sama tetap perlu kurung
  const needR =
    prec(n.r) < prec(n) ||
    (prec(n.r) === prec(n) && (n.op === '-' || n.op === '÷'));
  const L = needL ? `(${render(n.l)})` : render(n.l);
  const R = needR ? `(${render(n.r)})` : render(n.r);
  return `${L} ${n.op} ${R}`;
}

export type EvalResult = { ok: boolean; value: number; reason?: string };

export type EvalRules = {
  /** maksimal angka di belakang koma untuk tiap hasil antara */
  maxDp: number;
  /** tolak bila ada hasil antara / akhir yang negatif */
  noNegative: boolean;
  /** pembagian wajib habis (tanpa sisa) */
  exactDivision: boolean;
  /** batas nilai absolut hasil antara */
  maxAbs: number;
};

export const DEFAULT_RULES: EvalRules = {
  maxDp: 1,
  noNegative: true,
  exactDivision: true,
  maxAbs: 9999,
};

/** Evaluasi sekaligus validasi tiap langkah hitung. */
export function evaluate(n: Node, rules: EvalRules = DEFAULT_RULES): EvalResult {
  if (n.t === 'num') {
    if (!isClean(n.v, rules.maxDp)) return { ok: false, value: NaN, reason: 'operand tidak bersih' };
    return { ok: true, value: n.v };
  }
  const L = evaluate(n.l, rules);
  if (!L.ok) return L;
  const R = evaluate(n.r, rules);
  if (!R.ok) return R;

  let v: number;
  switch (n.op) {
    case '+': v = L.value + R.value; break;
    case '-': v = L.value - R.value; break;
    case '×': v = L.value * R.value; break;
    case '÷':
      if (R.value === 0) return { ok: false, value: NaN, reason: 'pembagian dengan nol' };
      v = L.value / R.value;
      if (rules.exactDivision && Math.abs(v - Math.round(v)) > 1e-9) {
        return { ok: false, value: NaN, reason: 'pembagian tidak habis' };
      }
      break;
  }
  v = r6(v);
  if (!Number.isFinite(v)) return { ok: false, value: NaN, reason: 'hasil tidak berhingga' };
  if (!isClean(v, rules.maxDp)) return { ok: false, value: v, reason: 'hasil antara lebih dari 1 desimal' };
  if (rules.noNegative && v < 0) return { ok: false, value: v, reason: 'hasil antara negatif' };
  if (Math.abs(v) > rules.maxAbs) return { ok: false, value: v, reason: 'hasil antara terlalu besar' };
  return { ok: true, value: v };
}

/** Nilai ekspresi tanpa validasi (dipakai untuk membuat pengecoh). */
export function evalRaw(n: Node): number {
  if (n.t === 'num') return n.v;
  const l = evalRaw(n.l);
  const r = evalRaw(n.r);
  switch (n.op) {
    case '+': return r6(l + r);
    case '-': return r6(l - r);
    case '×': return r6(l * r);
    case '÷': return r === 0 ? NaN : r6(l / r);
  }
}

/** Jumlah operasi dalam ekspresi. */
export function opCount(n: Node): number {
  return n.t === 'num' ? 0 : 1 + opCount(n.l) + opCount(n.r);
}

/** Daftar operator yang dipakai, urut kiri-ke-kanan. */
export function opsUsed(n: Node): Op[] {
  if (n.t === 'num') return [];
  return [...opsUsed(n.l), n.op, ...opsUsed(n.r)];
}

/** Semua nilai operand (daun). */
export function operands(n: Node): number[] {
  return n.t === 'num' ? [n.v] : [...operands(n.l), ...operands(n.r)];
}

/** Apakah render-nya mengandung tanda kurung. */
export function hasParen(n: Node): boolean {
  return render(n).includes('(');
}

/**
 * Cek aturan desimal: operand desimal hanya boleh menjadi suku
 * penjumlahan/pengurangan, tidak boleh dikalikan atau dibagi.
 */
export function decimalPlacementOk(n: Node, parentOp: Op | null = null): boolean {
  if (n.t === 'num') {
    if (Number.isInteger(n.v)) return true;
    return parentOp === null || parentOp === '+' || parentOp === '-';
  }
  // grup dalam kurung yang dikali/dibagi tidak boleh mengandung desimal
  if ((parentOp === '×' || parentOp === '÷') && operands(n).some((v) => !Number.isInteger(v))) {
    return false;
  }
  return decimalPlacementOk(n.l, n.op) && decimalPlacementOk(n.r, n.op);
}

/* ---------------------------------------------------------------- langkah */

function cloneWith(n: Node, target: Node, replacement: Node): Node {
  if (n === target) return replacement;
  if (n.t === 'num') return n;
  return { t: 'op', op: n.op, l: cloneWith(n.l, target, replacement), r: cloneWith(n.r, target, replacement) };
}

type Siap = { node: Extract<Node, { t: 'op' }>; dalamKurung: boolean };

/** Semua operasi yang kedua operandnya sudah berupa angka, urut kiri ke kanan. */
function kumpulkanSiap(
  n: Node,
  induk: Extract<Node, { t: 'op' }> | null,
  sisi: 'l' | 'r' | null,
  out: Siap[],
): void {
  if (n.t === 'num') return;
  kumpulkanSiap(n.l, n, 'l', out);
  kumpulkanSiap(n.r, n, 'r', out);
  if (n.l.t === 'num' && n.r.t === 'num') {
    out.push({ node: n, dalamKurung: induk && sisi ? anakDikurung(induk, sisi) : false });
  }
}

/**
 * Operasi yang dikerjakan berikutnya, mengikuti urutan yang biasa diajarkan:
 * isi tanda kurung lebih dahulu, lalu perkalian/pembagian, baru sisanya dari
 * kiri ke kanan. Hasil akhirnya sama apa pun urutannya, tetapi urutan ini yang
 * membuat pembahasannya masuk akal untuk dibaca.
 */
function pilihSiap(n: Node): Siap | null {
  const semua: Siap[] = [];
  kumpulkanSiap(n, null, null, semua);
  if (!semua.length) return null;
  // sort stabil: yang seri tetap mempertahankan urutan kiri ke kanan
  semua.sort(
    (a, b) =>
      Number(b.dalamKurung) - Number(a.dalamKurung) || prec(b.node) - prec(a.node),
  );
  return semua[0];
}

function firstReducible(n: Node): Node | null {
  return pilihSiap(n)?.node ?? null;
}

/**
 * Rangkaian langkah penyelesaian, mis.
 * ["(24 + 16) × 5 - 30", "40 × 5 - 30", "200 - 30", "170"].
 */
export function steps(n: Node): string[] {
  const out = [render(n)];
  let cur = n;
  for (let guard = 0; guard < 12; guard++) {
    const target = firstReducible(cur);
    if (!target || target.t !== 'op') break;
    cur = cloneWith(cur, target, num(evalRaw(target)));
    out.push(render(cur));
    if (cur.t === 'num') break;
  }
  return out;
}

/** Apakah anak pada sisi tertentu akan dibungkus tanda kurung saat di-render. */
function anakDikurung(induk: Extract<Node, { t: 'op' }>, sisi: 'l' | 'r'): boolean {
  const anak = sisi === 'l' ? induk.l : induk.r;
  if (prec(anak) < prec(induk)) return true;
  return sisi === 'r' && prec(anak) === prec(induk) && (induk.op === '-' || induk.op === '÷');
}

/**
 * Dari mana sebuah operand berasal:
 * null = angka asli soal, 'terakhir' = hasil langkah tepat sebelumnya,
 * 'kurung' = hasil operasi di dalam tanda kurung, 'lampau' = hasil langkah lama.
 */
export type AsalOperand = null | 'terakhir' | 'kurung' | 'lampau';

export type LangkahReduksi = {
  op: Op;
  /** teks operand kiri & kanan pada langkah ini */
  kiri: string;
  kanan: string;
  asalKiri: AsalOperand;
  asalKanan: AsalOperand;
  hasil: number;
  hasilTeks: string;
  /** operasi ini berada di dalam tanda kurung */
  dalamKurung: boolean;
  /** masih ada penjumlahan/pengurangan lain di ekspresi saat langkah ini dikerjakan */
  adaTambahKurangLain: boolean;
  /** bentuk ekspresi setelah langkah ini dikerjakan */
  sesudah: string;
  /** langkah terakhir: ekspresi sudah tinggal satu angka */
  selesai: boolean;
};

/**
 * Bedah langkah demi langkah beserta konteksnya (di dalam kurung? memakai
 * hasil langkah sebelumnya?) sebagai bahan mentah penyusunan pembahasan.
 */
export function reduksi(n: Node): LangkahReduksi[] {
  const out: LangkahReduksi[] = [];
  let cur = n;
  let terakhir: Node | null = null;
  const riwayat = new Map<Node, 'kurung' | 'biasa'>();

  const asal = (o: Node): AsalOperand => {
    if (o === terakhir) return 'terakhir';
    const r = riwayat.get(o);
    return r === undefined ? null : r === 'kurung' ? 'kurung' : 'lampau';
  };

  for (let guard = 0; guard < 12; guard++) {
    const siap = pilihSiap(cur);
    if (!siap) break;
    const { node: target, dalamKurung } = siap;
    if (target.l.t !== 'num' || target.r.t !== 'num') break;

    const adaTambahKurangLain =
      (target.op === '×' || target.op === '÷') &&
      opsUsedKecuali(cur, target).some((o) => o === '+' || o === '-');

    const asalKiri = asal(target.l);
    const asalKanan = asal(target.r);

    const hasil = evalRaw(target);
    const pengganti = num(hasil);
    cur = cloneWith(cur, target, pengganti);
    riwayat.set(pengganti, dalamKurung ? 'kurung' : 'biasa');
    terakhir = pengganti;

    out.push({
      op: target.op,
      kiri: fmt(target.l.v),
      kanan: fmt(target.r.v),
      asalKiri,
      asalKanan,
      hasil,
      hasilTeks: fmt(hasil),
      dalamKurung,
      adaTambahKurangLain,
      sesudah: render(cur),
      selesai: cur.t === 'num',
    });

    if (cur.t === 'num') break;
  }

  return out;
}

function opsUsedKecuali(n: Node, kecuali: Node): Op[] {
  if (n.t === 'num' || n === kecuali) return [];
  return [...opsUsedKecuali(n.l, kecuali), n.op, ...opsUsedKecuali(n.r, kecuali)];
}
