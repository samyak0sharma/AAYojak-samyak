import { useMemo } from 'react';

const SIZE = 33;
const DATA_CODEWORDS = 80;
const ECC_CODEWORDS = 20;

function multiply(a: number, b: number) {
  let result = 0;
  for (let value = b; value > 0; value >>>= 1) { if (value & 1) result ^= a; a = (a << 1) ^ ((a & 0x80) ? 0x11d : 0); }
  return result;
}

function generatorPolynomial() {
  const polynomial = [1]; let root = 1;
  for (let index = 0; index < ECC_CODEWORDS; index += 1) {
    const next = Array.from({ length: polynomial.length + 1 }, () => 0);
    for (let i = 0; i < polynomial.length; i += 1) { next[i]! ^= polynomial[i]!; next[i + 1]! ^= multiply(polynomial[i]!, root); }
    polynomial.splice(0, polynomial.length, ...next); root = multiply(root, 2);
  }
  return polynomial;
}

function errorCorrection(data: number[]) {
  const generator = generatorPolynomial(); const result = Array.from({ length: ECC_CODEWORDS }, () => 0);
  for (const value of data) {
    const factor = value ^ result[0]!; result.shift(); result.push(0);
    for (let i = 0; i < result.length; i += 1) result[i]! ^= multiply(generator[i + 1]!, factor);
  }
  return result;
}

function bchTypeInfo(value: number) {
  let data = value << 10;
  while (data.toString(2).length - 1 >= 10) data ^= 0x537 << (data.toString(2).length - 1 - 10);
  return ((value << 10) | data) ^ 0x5412;
}

function setFunction(modules: boolean[][], reserved: boolean[][], row: number, col: number, value: boolean) { modules[row]![col] = value; reserved[row]![col] = true; }

function finder(modules: boolean[][], reserved: boolean[][], row: number, col: number) {
  for (let dy = -1; dy <= 7; dy += 1) for (let dx = -1; dx <= 7; dx += 1) {
    const y = row + dy; const x = col + dx;
    if (y < 0 || y >= SIZE || x < 0 || x >= SIZE) continue;
    const dark = (0 <= dy && dy <= 6 && (dx === 0 || dx === 6)) || (0 <= dx && dx <= 6 && (dy === 0 || dy === 6)) || (2 <= dy && dy <= 4 && 2 <= dx && dx <= 4);
    setFunction(modules, reserved, y, x, dark);
  }
}

function alignment(modules: boolean[][], reserved: boolean[][], row: number, col: number) {
  for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) setFunction(modules, reserved, row + dy, col + dx, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
}

function makeMatrix(payload: string) {
  const modules = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => false));
  const reserved = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => false));
  finder(modules, reserved, 0, 0); finder(modules, reserved, 0, SIZE - 7); finder(modules, reserved, SIZE - 7, 0);
  for (let i = 8; i < SIZE - 8; i += 1) { setFunction(modules, reserved, 6, i, i % 2 === 0); setFunction(modules, reserved, i, 6, i % 2 === 0); }
  for (const [row, col] of [[26, 26], [6, 26], [26, 6]] as const) if (!reserved[row]![col]) alignment(modules, reserved, row, col);
  for (let i = 0; i < 6; i += 1) { setFunction(modules, reserved, i, 8, false); setFunction(modules, reserved, SIZE - 1 - i, 8, false); setFunction(modules, reserved, 8, i, false); setFunction(modules, reserved, 8, SIZE - 1 - i, false); }
  for (let i = 6; i < 8; i += 1) { setFunction(modules, reserved, i + 1, 8, false); setFunction(modules, reserved, SIZE - 1 - i, 8, false); setFunction(modules, reserved, 8, i, false); setFunction(modules, reserved, 8, SIZE - 1 - i - 1, false); }
  setFunction(modules, reserved, 8, 8, false); setFunction(modules, reserved, SIZE - 8, 8, true);
  const format = bchTypeInfo(1 << 3); // Error correction level L, mask 0.
  for (let i = 0; i < 15; i += 1) {
    const bit = ((format >>> i) & 1) !== 0;
    if (i < 6) setFunction(modules, reserved, i, 8, bit); else if (i < 8) setFunction(modules, reserved, i + 1, 8, bit); else setFunction(modules, reserved, SIZE - 15 + i, 8, bit);
    if (i < 8) setFunction(modules, reserved, 8, SIZE - i - 1, bit); else if (i < 9) setFunction(modules, reserved, 8, 15 - i, bit); else setFunction(modules, reserved, 8, 15 - i - 1, bit);
  }
  const bytes = new TextEncoder().encode(payload); if (bytes.length > 78) throw new Error('QR payload is too long.');
  const bits: number[] = []; const append = (value: number, length: number) => { for (let i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1); };
  append(4, 4); append(bytes.length, 8); for (const byte of bytes) append(byte, 8); append(0, Math.min(4, DATA_CODEWORDS * 8 - bits.length)); while (bits.length % 8) bits.push(0);
  const data: number[] = []; for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((value, bit) => (value << 1) | bit, 0));
  for (let pad = 0xec; data.length < DATA_CODEWORDS; pad ^= 0xec ^ 0x11) data.push(pad);
  const codewords = data.concat(errorCorrection(data)); let bitIndex = 0; let upward = true;
  for (let col = SIZE - 1; col > 0; col -= 2) { if (col === 6) col -= 1; for (let offset = 0; offset < SIZE; offset += 1) { const row = upward ? SIZE - 1 - offset : offset; for (const currentCol of [col, col - 1]) if (!reserved[row]![currentCol]) { const bit = bitIndex < codewords.length * 8 && ((codewords[bitIndex >>> 3]! >>> (7 - (bitIndex & 7))) & 1) !== 0; modules[row]![currentCol] = bit !== ((row + currentCol) % 2 === 0); bitIndex += 1; } } upward = !upward; }
  return modules;
}

function svgFor(payload: string) {
  const matrix = makeMatrix(payload); const quiet = 4; const size = SIZE + quiet * 2; const paths: string[] = [];
  for (let row = 0; row < SIZE; row += 1) for (let col = 0; col < SIZE; col += 1) if (matrix[row]![col]) paths.push(`M${col + quiet},${row + quiet}h1v1h-1z`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="Ticket QR code"><rect width="100%" height="100%" fill="white"/><path d="${paths.join('')}" fill="black"/></svg>`;
}

export function QrCode({ value }: { value: string }) { const svg = useMemo(() => svgFor(value), [value]); return <span className="ticket-qr" dangerouslySetInnerHTML={{ __html: svg }} />; }
