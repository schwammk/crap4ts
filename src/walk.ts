import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage']);
const SKIP_FILES = [/\.d\.ts$/, /\.(spec|test)\.ts$/];

export function listSourceFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(join(dir, entry.name));
        continue;
      }
      if (!entry.name.endsWith('.ts')) continue;
      if (SKIP_FILES.some((re) => re.test(entry.name))) continue;
      out.push(join(dir, entry.name));
    }
  };
  walk(root);
  return out.sort();
}
