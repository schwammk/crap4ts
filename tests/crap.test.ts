import { describe, expect, it } from 'vitest';
import { crapScore, riskBand } from '../src/crap.js';

describe('crapScore', () => {
  it('is cc when fully covered', () => {
    expect(crapScore(3, 1)).toBe(3);
    expect(crapScore(1, 1)).toBe(1);
  });

  it('is cc² + cc when uncovered', () => {
    expect(crapScore(3, 0)).toBe(12);
    expect(crapScore(6, 0)).toBe(42);
  });

  it('interpolates by (1-cov)³', () => {
    expect(crapScore(3, 0.5)).toBeCloseTo(9 * 0.125 + 3);
  });

  it('is null for unknown coverage', () => {
    expect(crapScore(3, null)).toBeNull();
  });
});

describe('riskBand', () => {
  it('bands ≤5 low, ≤30 moderate, >30 high', () => {
    expect(riskBand(1)).toBe('low');
    expect(riskBand(5)).toBe('low');
    expect(riskBand(5.01)).toBe('moderate');
    expect(riskBand(30)).toBe('moderate');
    expect(riskBand(30.01)).toBe('high');
  });

  it('bands null as unknown', () => {
    expect(riskBand(null)).toBe('unknown');
  });
});
