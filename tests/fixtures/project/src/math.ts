export function add(a: number, b: number): number {
  if (a > 0) {
    return a + b;
  }
  return b;
}

export function scale(n: number, f: number): number {
  if (n > 0) {
    if (f > 0) {
      return n * f;
    }
  }
  return 0;
}

export function boom(a: number, b: number, c: number, d: number, e: number): number {
  let x = 0;
  if (a > 0) x += 1;
  if (b > 0) x += 2;
  if (c > 0) x += 3;
  if (d > 0) x += 4;
  if (e > 0) x += 5;
  return x;
}
