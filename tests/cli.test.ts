import { describe, expect, it } from 'vitest';
import { parseArgs, CliError, runCli } from '../src/cli.js';
import type { Io } from '../src/cli.js';
import { join } from 'node:path';

const fixture = join(import.meta.dirname, 'fixtures/project');
const lcov = join(fixture, 'coverage/lcov.info');

function recordingIo(): { io: Io; out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  return {
    io: {
      stdout: (s) => out.push(s),
      stderr: (s) => err.push(s),
      exec: async () => {
        throw new Error('no exec in test');
      },
    },
    out,
    err,
  };
}

describe('parseArgs', () => {
  it('applies defaults', () => {
    expect(parseArgs([])).toEqual({
      sourceRoot: 'src',
      lcov: [],
      coverageCommand: undefined,
      useExistingCoverage: false,
      threshold: 30,
      format: 'text',
    });
  });

  it('parses all flags', () => {
    const opts = parseArgs([
      '--source-root', 'packages',
      '--lcov', 'coverage/a/lcov.info',
      '--lcov', 'coverage/b/lcov.info',
      '--coverage-command', 'nx run-many -t test --coverage',
      '--threshold', '15',
      '--format', 'json',
    ]);
    expect(opts).toEqual({
      sourceRoot: 'packages',
      lcov: ['coverage/a/lcov.info', 'coverage/b/lcov.info'],
      coverageCommand: 'nx run-many -t test --coverage',
      useExistingCoverage: true,
      threshold: 15,
      format: 'json',
    });
  });

  it('rejects unknown flags with CliError', () => {
    expect(() => parseArgs(['--wat'])).toThrow(CliError);
  });

  it('rejects a bad threshold', () => {
    expect(() => parseArgs(['--threshold', 'nope'])).toThrow(CliError);
  });

  it('rejects a negative threshold', () => {
    expect(() => parseArgs(['--threshold', '-5'])).toThrow(CliError);
  });

  it('rejects an empty or whitespace threshold', () => {
    expect(() => parseArgs(['--threshold', ''])).toThrow(CliError);
    expect(() => parseArgs(['--threshold', '   '])).toThrow(CliError);
  });

  it('rejects a bad format', () => {
    expect(() => parseArgs(['--format', 'yaml'])).toThrow(CliError);
  });

  it('rejects --coverage-command without --lcov', () => {
    expect(() => parseArgs(['--coverage-command', 'nx test'])).toThrow(CliError);
  });
});

describe('runCli', () => {
  it('produces the report and exits 0 under threshold 30', async () => {
    const { io, out, err } = recordingIo();
    const code = await runCli(
      ['--source-root', join(fixture, 'src'), '--lcov', lcov, '--use-existing-coverage', '--threshold', '50'],
      io,
    );
    expect(code).toBe(0);
    expect(out.join('')).toContain('42.00');
    expect(out.join('')).toContain('12.00');
    expect(out.join('')).toContain('2.00');
    expect(err.join('')).not.toContain('warning');
  });

  it('exits 1 when a function exceeds the threshold', async () => {
    const { io } = recordingIo();
    const code = await runCli(
      ['--source-root', join(fixture, 'src'), '--lcov', lcov, '--use-existing-coverage', '--threshold', '30'],
      io,
    );
    expect(code).toBe(1);
  });

  it('warns about functions without coverage data', async () => {
    const { io, err } = recordingIo();
    const code = await runCli(
      ['--source-root', join(fixture, 'src'), '--lcov', join(fixture, 'coverage/does-not-exist.info'), '--use-existing-coverage'],
      io,
    );
    expect(code).toBe(0);
    expect(err.join('')).toContain('no coverage file');
    expect(err.join('')).toContain('no coverage data');
  });

  it('returns 2 on a bad coverage command', async () => {
    const { io, err } = recordingIo();
    const code = await runCli(
      ['--source-root', join(fixture, 'src'), '--lcov', lcov, '--coverage-command', 'exit 3'],
      io,
    );
    expect(code).toBe(2);
    expect(err.join('')).toContain('coverage command failed');
  });

  it('returns 2 on a parse error from bad args', async () => {
    const { io, err } = recordingIo();
    const code = await runCli(['--nope'], io);
    expect(code).toBe(2);
    expect(err.join('')).toContain('unknown option');
  });
});
