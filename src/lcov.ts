import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname, sep } from 'node:path';
import type { CollectedFunction } from './complexity.js';
import { crapScore, riskBand } from './crap.js';
import type { ScoredFunction } from './crap.js';

export interface LcovFunction {
  line: number;
  name: string;
  hits: number;
}

export interface LcovFile {
  file: string;
  functions: LcovFunction[];
}

const SKIPPED = ['TN:', 'DA:', 'LF:', 'LH:', 'FNF:', 'FNH:', 'BRF:', 'BRH:', 'BRDA:'];

export function parseLcov(text: string, sourceName = '<lcov>'): LcovFile[] {
  const files: LcovFile[] = [];
  let current: LcovFile | null = null;
  const fnLines = new Map<string, number>();
  let recordNo = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '') continue;
    if (line === 'end_of_record') {
      if (current) files.push(current);
      current = null;
      fnLines.clear();
      continue;
    }
    if (SKIPPED.some((p) => line.startsWith(p))) continue;
    const sf = line.match(/^SF:(.+)$/);
    if (sf) {
      recordNo++;
      current = { file: sf[1].trim(), functions: [] };
      fnLines.clear();
      continue;
    }
    if (!current) {
      throw new Error(`malformed LCOV record in ${sourceName} (record ${Math.max(recordNo, 1)}): "${line}"`);
    }
    const fn = line.match(/^FN:(\d+),(.+)$/);
    if (fn) {
      fnLines.set(fn[2], Number(fn[1]));
      continue;
    }
    const fnda = line.match(/^FNDA:(\d+),(.+)$/);
    if (fnda) {
      current.functions.push({ line: fnLines.get(fnda[2]) ?? 0, name: fnda[2], hits: Number(fnda[1]) });
      continue;
    }
    throw new Error(`malformed LCOV record in ${sourceName} (record ${Math.max(recordNo, 1)}): "${line}"`);
  }
  return files;
}

function globToRegExp(pattern: string): RegExp {
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === '*') {
      if (pattern[i + 1] === '*') {
        i++;
        if (pattern[i + 1] === '/') {
          i++;
          re += '(?:.*/)?';
        } else {
          re += '.*';
        }
      } else {
        re += '[^/]*';
      }
    } else if (ch === '?') {
      re += '.';
    } else {
      re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${re}$`);
}

function staticRoot(pattern: string): string {
  const parts = pattern.split(sep);
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].includes('*') || parts[i].includes('?')) {
      return i === 0 ? sep : join(sep, ...parts.slice(0, i));
    }
  }
  return dirname(pattern);
}

export function expandGlobs(patterns: readonly string[], cwd: string = process.cwd()): string[] {
  const found = new Set<string>();
  for (const raw of patterns) {
    const pattern = resolve(cwd, raw);
    const re = globToRegExp(pattern);
    const root = staticRoot(pattern);
    const walk = (dir: string): void => {
      let entries;
      try {
        entries = readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (re.test(full)) found.add(full);
      }
    };
    walk(root);
  }
  return [...found].sort();
}

export function mergeLcov(
  paths: readonly string[],
  cwd: string = process.cwd(),
): { files: LcovFile[]; missing: string[] } {
  const merged = new Map<string, LcovFile>();
  const missing: string[] = [];
  const inputs = new Set<string>();
  for (const raw of paths) {
    if (raw.includes('*') || raw.includes('?')) {
      for (const found of expandGlobs([raw], cwd)) inputs.add(found);
    } else {
      inputs.add(resolve(cwd, raw));
    }
  }
  for (const file of [...inputs].sort()) {
    let text: string;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      missing.push(file);
      continue;
    }
    for (const parsed of parseLcov(text, file)) {
      const key = parsed.file;
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, { file: key, functions: parsed.functions.map((f) => ({ ...f })) });
        continue;
      }
      for (const fn of parsed.functions) {
        const prior = existing.functions.find((f) => f.name === fn.name && f.line === fn.line);
        if (prior) prior.hits = Math.max(prior.hits, fn.hits);
        else existing.functions.push({ ...fn });
      }
    }
  }
  return { files: [...merged.values()], missing };
}

function normalize(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\.\//, '');
}

function sameFile(a: string, b: string): boolean {
  const x = normalize(a);
  const y = normalize(b);
  return x === y || x.endsWith(`/${y}`) || y.endsWith(`/${x}`);
}

function coverageFor(fn: CollectedFunction, lcov: readonly LcovFile[]): number | null {
  const file = lcov.find((f) => sameFile(f.file, fn.file));
  if (!file) return null;
  const byLine = file.functions.filter((r) => r.line === fn.startLine);
  if (byLine.length === 1) return byLine[0].hits > 0 ? 1 : 0;
  const byName = file.functions.filter((r) => r.name === fn.name || r.name.endsWith(`.${fn.name}`));
  if (byName.length === 1) return byName[0].hits > 0 ? 1 : 0;
  return null;
}

export function joinCoverage(
  functions: readonly CollectedFunction[],
  lcov: readonly LcovFile[],
): ScoredFunction[] {
  return functions.map((fn) => {
    const coverage = coverageFor(fn, lcov);
    const crap = crapScore(fn.cc, coverage);
    return { file: fn.file, name: fn.name, cc: fn.cc, coverage, crap, risk: riskBand(crap) };
  });
}
