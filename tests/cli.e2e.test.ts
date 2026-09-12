import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { symlinkSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const fixture = join(import.meta.dirname, 'fixtures/project');
const lcov = join(fixture, 'coverage/lcov.info');

describe('built CLI', () => {
  it('exits 1 when boom exceeds threshold 30 and prints the table', () => {
    const r = spawnSync(
      process.execPath,
      [
        'dist/cli.js',
        '--source-root', join(fixture, 'src'),
        '--lcov', lcov,
        '--use-existing-coverage',
        '--threshold', '30',
      ],
      { encoding: 'utf8' },
    );
    expect(r.stdout).toContain('42.00');
    expect(r.status).toBe(1);
  });

  it('exits 2 on an unknown flag', () => {
    const r = spawnSync(process.execPath, ['dist/cli.js', '--wat'], { encoding: 'utf8' });
    expect(r.stderr).toContain('unknown option');
    expect(r.status).toBe(2);
  });

  it('works when invoked through a symlinked bin (npm link)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'crap4ts-bin-'));
    const bin = join(dir, 'crap4ts');
    symlinkSync(join(import.meta.dirname, '../dist/cli.js'), bin);
    const r = spawnSync(
      process.execPath,
      [
        bin,
        '--source-root', join(fixture, 'src'),
        '--lcov', lcov,
        '--use-existing-coverage',
      ],
      { encoding: 'utf8' },
    );
    expect(r.stdout).toContain('42.00');
    expect(r.status).toBe(1);
  });
});
