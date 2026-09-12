#!/usr/bin/env node

export class CliError extends Error {}

export interface CliOptions {
  sourceRoot: string;
  lcov: string[];
  coverageCommand?: string;
  useExistingCoverage: boolean;
  threshold: number;
  format: 'text' | 'json';
}

export function parseArgs(argv: readonly string[]): CliOptions {
  const options: CliOptions = {
    sourceRoot: 'src',
    lcov: [],
    coverageCommand: undefined,
    useExistingCoverage: false,
    threshold: 30,
    format: 'text',
  };
  const needValue = (flag: string, i: number): string => {
    if (i + 1 >= argv.length) throw new CliError(`${flag} requires a value`);
    return argv[i + 1];
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    switch (flag) {
      case '--source-root':
        options.sourceRoot = needValue(flag, i);
        i++;
        break;
      case '--lcov':
        options.lcov.push(needValue(flag, i));
        i++;
        break;
      case '--coverage-command':
        options.coverageCommand = needValue(flag, i);
        i++;
        break;
      case '--use-existing-coverage':
        options.useExistingCoverage = true;
        break;
      case '--threshold': {
        const value = Number(needValue(flag, i));
        if (!Number.isFinite(value) || value < 0) throw new CliError('--threshold must be a non-negative number');
        options.threshold = value;
        i++;
        break;
      }
      case '--format': {
        const value = needValue(flag, i);
        if (value !== 'text' && value !== 'json') throw new CliError("--format must be 'text' or 'json'");
        options.format = value;
        i++;
        break;
      }
      default:
        throw new CliError(`unknown option: ${flag}`);
    }
  }
  if (options.coverageCommand !== undefined && options.lcov.length === 0) {
    throw new CliError('--coverage-command requires at least one --lcov');
  }
  if (options.coverageCommand !== undefined) options.useExistingCoverage = true;
  return options;
}
