import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CollectedFunction } from '../src/complexity.js';
import { expandGlobs, joinCoverage, mergeLcov, parseLcov } from '../src/lcov.js';

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

describe('expandGlobs', () => {
  it('finds nested lcov files with ** and *', () => {
    const dir = mkdtempSync(join(tmpdir(), 'crap4ts-glob-'));
    mkdirSync(join(dir, 'coverage/app-1/impl'), { recursive: true });
    mkdirSync(join(dir, 'coverage/app-2/impl'), { recursive: true });
    writeFileSync(join(dir, 'coverage/app-1/impl/lcov.info'), '');
    writeFileSync(join(dir, 'coverage/app-2/impl/lcov.info'), '');
    const found = expandGlobs(['coverage/**/lcov.info'], dir);
    expect(found).toEqual([
      join(dir, 'coverage/app-1/impl/lcov.info'),
      join(dir, 'coverage/app-2/impl/lcov.info'),
    ]);
    rmSync(dir, { recursive: true, force: true });
  });

  it('ignores node_modules', () => {
    const dir = mkdtempSync(join(tmpdir(), 'crap4ts-glob2-'));
    mkdirSync(join(dir, 'node_modules/pkg'), { recursive: true });
    writeFileSync(join(dir, 'node_modules/pkg/lcov.info'), '');
    expect(expandGlobs(['**/lcov.info'], dir)).toEqual([]);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('mergeLcov', () => {
  it('merges duplicate SF paths with max hits, reports missing paths', () => {
    const dir = mkdtempSync(join(tmpdir(), 'crap4ts-merge-'));
    writeFileSync(
      join(dir, 'a.info'),
      'SF:src/shared.ts\nFN:1,f\nFNDA:0,f\nend_of_record\nSF:src/a.ts\nFN:1,onlyA\nFNDA:1,onlyA\nend_of_record\n',
    );
    writeFileSync(join(dir, 'b.info'), 'SF:src/shared.ts\nFN:1,f\nFNDA:2,f\nend_of_record\n');
    const { files, missing } = mergeLcov([join(dir, 'a.info'), join(dir, 'b.info'), join(dir, 'gone.info')]);
    expect(missing).toEqual([join(dir, 'gone.info')]);
    const shared = files.filter((f) => f.file === 'src/shared.ts');
    expect(shared).toHaveLength(1);
    expect(shared[0].functions[0].hits).toBe(2);
    expect(files.filter((f) => f.file === 'src/a.ts')).toHaveLength(1);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('joinCoverage', () => {
  const fn = (over: Partial<CollectedFunction>): CollectedFunction => ({
    file: 'packages/app-1/src/math.ts',
    name: 'add',
    cc: 2,
    startLine: 3,
    endLine: 3,
    ...over,
  });

  it('joins by exact line within a suffix-matched file', () => {
    const lcov = parseLcov('SF:impl/packages/app-1/src/math.ts\nFN:3,add\nFNDA:2,add\nend_of_record\n');
    const [scored] = joinCoverage([fn({})], lcov);
    expect(scored).toEqual({
      file: 'packages/app-1/src/math.ts',
      name: 'add',
      cc: 2,
      startLine: 3,
      endLine: 3,
      coverage: 1,
      crap: 2,
      risk: 'low',
    });
  });

  it('reports uncovered functions as coverage 0', () => {
    const lcov = parseLcov('SF:p/src/math.ts\nFN:3,add\nFNDA:0,add\nend_of_record\n');
    expect(joinCoverage([fn({ file: 'src/math.ts' })], lcov)[0].coverage).toBe(0);
  });

  it('falls back to name-suffix match when lines disagree', () => {
    const lcov = parseLcov('SF:p/src/math.ts\nFN:99,Greeter.greet\nFNDA:1,Greeter.greet\nend_of_record\n');
    const [scored] = joinCoverage([fn({ file: 'src/math.ts', name: 'greet', startLine: 5 })], lcov);
    expect(scored.coverage).toBe(1);
  });

  it('leaves unmatched functions with null coverage and unknown risk', () => {
    const [scored] = joinCoverage([fn({})], []);
    expect(scored.coverage).toBeNull();
    expect(scored.crap).toBeNull();
    expect(scored.risk).toBe('unknown');
  });

  it('leaves ambiguous matches (two same-line suffix-matching records) as null', () => {
    const lcov = parseLcov('SF:p/src/math.ts\nFN:3,add\nFNDA:1,add\nFN:3,Sub.add\nFNDA:1,Sub.add\nend_of_record\n');
    expect(joinCoverage([fn({})], lcov)[0].coverage).toBeNull();
  });
});
