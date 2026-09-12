import { describe, expect, it } from 'vitest';
import { parseLcov } from '../src/lcov.js';

const SAMPLE = `
SF:src/math.ts
FN:3,add
FNDA:2,add
FN:8,scale
FNDA:0,scale
LH:4
LF:6
end_of_record
SF:src/other.ts
FN:2,boom
FNDA:1,boom
end_of_record
`;

describe('parseLcov', () => {
  it('produces one entry per SF record', () => {
    const files = parseLcov(SAMPLE);
    expect(files.map((f) => f.file)).toEqual(['src/math.ts', 'src/other.ts']);
  });

  it('joins FN lines with FNDA hits', () => {
    const [math] = parseLcov(SAMPLE);
    expect(math.functions).toEqual([
      { line: 3, name: 'add', hits: 2 },
      { line: 8, name: 'scale', hits: 0 },
    ]);
  });

  it('handles FNDA without a preceding FN (line 0)', () => {
    const files = parseLcov('SF:a.ts\nFNDA:1,ghost\nend_of_record\n');
    expect(files[0].functions).toEqual([{ line: 0, name: 'ghost', hits: 1 }]);
  });

  it('returns [] for empty text', () => {
    expect(parseLcov('')).toEqual([]);
  });

  it('throws on an unknown directive with context', () => {
    expect(() => parseLcov('SF:a.ts\nGARBAGE:1\nend_of_record\n', 'cov/a.info')).toThrowError(
      /malformed LCOV record in cov\/a\.info \(record 1\): "GARBAGE:1"/,
    );
  });

  it('reports record 1 for a malformed line before any SF', () => {
    expect(() => parseLcov('GARBAGE:1\nSF:a.ts\nend_of_record\n', 'cov/a.info')).toThrowError(
      /malformed LCOV record in cov\/a\.info \(record 1\): "GARBAGE:1"/,
    );
  });

  it('reports the correct record number for a malformed line in a later record', () => {
    expect(() => parseLcov('SF:a.ts\nend_of_record\nSF:b.ts\nGARBAGE:1\nend_of_record\n', 'cov/a.info')).toThrowError(
      /malformed LCOV record in cov\/a\.info \(record 2\): "GARBAGE:1"/,
    );
  });
});
