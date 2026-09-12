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
