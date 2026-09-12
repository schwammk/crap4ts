import { describe, expect, it } from 'vitest';
import { computeComplexity } from '../src/complexity.js';

describe('computeComplexity: collection and naming', () => {
  it('collects a plain function with CC 1', () => {
    const src = 'export function base(): number { return 1; }';
    const fns = computeComplexity(src, 'src/a.ts');
    expect(fns).toHaveLength(1);
    expect(fns[0]).toMatchObject({ file: 'src/a.ts', name: 'base', cc: 1, startLine: 1 });
  });

  it('names a class method and constructor as Class.method', () => {
    const src = `
export class Greeter {
  greet(): string { return 'hi'; }
  constructor() {}
}
`;
    const fns = computeComplexity(src, 'src/g.ts');
    const names = fns.map((f) => f.name).sort();
    expect(names).toEqual(['Greeter.constructor', 'Greeter.greet']);
  });

  it('names an arrow assigned to a const after the variable', () => {
    const src = 'export const scale = (n: number): number => n * 2;';
    const fns = computeComplexity(src, 'src/s.ts');
    expect(fns[0].name).toBe('scale');
  });

  it('names an object-literal method after its key', () => {
    const src = 'export const obj = { ping(): number { return 1; } };';
    const fns = computeComplexity(src, 'src/o.ts');
    expect(fns[0].name).toBe('ping');
  });

  it('reports 1-based start lines', () => {
    const src = 'export const a = (): void => {};\n\nexport function b(): void {}\n';
    const fns = computeComplexity(src, 'src/l.ts');
    expect(fns.find((f) => f.name === 'b')!.startLine).toBe(3);
  });
});

describe('computeComplexity: decision points', () => {
  const ccOf = (src: string): number => computeComplexity(src, 'src/cc.ts')[0].cc;

  it('base is 1', () => {
    expect(ccOf('function base(): number { return 1; }')).toBe(1);
  });

  it('counts if (+1), and else-if as another if', () => {
    expect(ccOf('function f(x: number) { if (x > 0) { x++; } return x; }')).toBe(2);
    expect(
      ccOf(
        'function f(x: number): string { if (x < 0) { return "n"; } else if (x === 0) { return "z"; } return "p"; }',
      ),
    ).toBe(3);
  });

  it('counts ternary', () => {
    expect(ccOf('function f(x: number) { return x > 0 ? 1 : 0; }')).toBe(2);
  });

  it('counts && || ??', () => {
    expect(ccOf('function f(a: boolean, b: boolean) { return a && b; }')).toBe(2);
    expect(ccOf('function f(a: boolean, b: boolean) { return a || b; }')).toBe(2);
    expect(ccOf('function f(x: string | undefined) { return x ?? "d"; }')).toBe(2);
  });

  it('counts &&= ||= ??=', () => {
    expect(ccOf('function f(o: { a?: number }) { o.a &&= 1; return o; }')).toBe(2);
    expect(ccOf('function f(o: { a?: number }) { o.a ||= 1; return o; }')).toBe(2);
    expect(ccOf('function f(o: { a?: number }) { o.a ??= 1; return o; }')).toBe(2);
  });

  it('counts every loop kind', () => {
    expect(ccOf('function f(a: number[]) { for (const x of a) { x++; } }')).toBe(2);
    expect(ccOf('function f(o: Record<string, number>) { for (const k in o) { o[k]++; } }')).toBe(2);
    expect(ccOf('function f(n: number) { for (let i = 0; i < n; i++) {} }')).toBe(2);
    expect(ccOf('function f(n: number) { while (n > 0) { n--; } }')).toBe(2);
    expect(ccOf('function f(n: number) { do { n--; } while (n > 0); }')).toBe(2);
  });

  it('counts each non-default case, not default', () => {
    expect(
      ccOf('function f(x: number): string { switch (x) { case 1: return "a"; case 2: return "b"; default: return "z"; } }'),
    ).toBe(3);
  });

  it('counts catch', () => {
    expect(ccOf('function f() { try { throw new Error("x"); } catch { return; } }')).toBe(2);
  });

  it('decisions inside a nested function belong to the nested function', () => {
    const src = 'function outer(xs: number[]) { const g = (x: number): number => { if (x > 0) { return x; } return 0; }; return xs.map(g); }';
    const fns = computeComplexity(src, 'src/n.ts');
    expect(fns.find((f) => f.name === 'outer')!.cc).toBe(1);
    expect(fns.find((f) => f.name === 'g')!.cc).toBe(2);
  });

  it('accumulates across kinds in one function', () => {
    expect(
      ccOf('function f(x: number, a: number[]): number { let s = 0; for (const y of a) { if (y > x) { s += y > 1 ? y : 0; } } return s; }'),
    ).toBe(4);
  });
});
