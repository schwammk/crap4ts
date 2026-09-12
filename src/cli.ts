#!/usr/bin/env node

import { exec as execCallback } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { collectFunctions } from './complexity.js';
import { joinCoverage, mergeLcov } from './lcov.js';
import { renderJson, renderText } from './report.js';

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

export interface Io {
  stdout(s: string): void;
  stderr(s: string): void;
  exec(cmd: string): Promise<void>;
}

const execAsync = (cmd: string): Promise<void> =>
  new Promise((resolve, reject) =>
    execCallback(cmd, {}, (err, _stdout, stderr) => {
      if (err) {
        const e = err as NodeJS.ErrnoException & { stderr?: string };
        e.message = `coverage command failed: ${cmd}`;
        e.stderr = String(stderr ?? '');
        reject(e);
      } else resolve();
    }),
  );

export const defaultIo: Io = {
  stdout: (s) => process.stdout.write(s),
  stderr: (s) => process.stderr.write(s),
  exec: execAsync,
};

export async function runCli(argv: readonly string[], io: Io = defaultIo): Promise<number> {
  let options: CliOptions;
  try {
    options = parseArgs(argv);
  } catch (e) {
    io.stderr(`crap4ts: ${(e as Error).message}\n`);
    return 2;
  }
  try {
    if (options.coverageCommand !== undefined) {
      try {
        await io.exec(options.coverageCommand);
      } catch (e) {
        const err = e as Error & { stderr?: string };
        io.stderr(`crap4ts: coverage command failed: ${options.coverageCommand}\n${err.stderr ?? ''}\n`);
        return 2;
      }
    }
    const { files, missing } = mergeLcov(options.lcov);
    for (const path of missing) io.stderr(`crap4ts: warning: no coverage file at ${path}\n`);
    const sourceRoot = existsSync(options.sourceRoot) ? options.sourceRoot : '.';
    const functions = collectFunctions(sourceRoot);
    const scored = joinCoverage(functions, files);
    for (const s of scored) {
      if (s.coverage === null) io.stderr(`crap4ts: warning: no coverage data for ${s.name} (${s.file})\n`);
    }
    io.stdout(options.format === 'json' ? renderJson(scored) : renderText(scored));
    return scored.some((s) => s.crap !== null && s.crap > options.threshold) ? 1 : 0;
  } catch (e) {
    io.stderr(`crap4ts: ${(e as Error).message}\n`);
    return 2;
  }
}

// realpath argv[1] so bins invoked through symlinks (e.g. npm link) still match
// import.meta.url, which Node resolves to the real file path.
const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
if (isMain) {
  process.exitCode = await runCli(process.argv.slice(2));
}
