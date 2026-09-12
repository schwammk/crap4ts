import { describe, expect, it } from 'vitest';
import { parseArgs, CliError } from '../src/cli.js';

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

  it('rejects a bad format', () => {
    expect(() => parseArgs(['--format', 'yaml'])).toThrow(CliError);
  });

  it('rejects --coverage-command without --lcov', () => {
    expect(() => parseArgs(['--coverage-command', 'nx test'])).toThrow(CliError);
  });
});
