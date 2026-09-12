import type { ScoredFunction } from './crap.js';

export function renderText(scored: readonly ScoredFunction[]): string {
  const sorted = [...scored].sort(
    (a, b) => (b.crap ?? -1) - (a.crap ?? -1) || a.name.localeCompare(b.name),
  );
  const rows = sorted.map((s) => [
    s.name,
    s.file,
    String(s.cc),
    s.coverage === null ? 'N/A' : String(Math.round(s.coverage * 100)),
    s.crap === null ? 'N/A' : s.crap.toFixed(2),
  ]);
  const header = ['Function', 'File', 'CC', 'Cov%', 'CRAP'];
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const pad = (cells: string[]): string => cells.map((c, i) => c.padEnd(widths[i])).join(' | ');
  return [pad(header), ...rows.map(pad), ''].join('\n');
}

export function renderJson(scored: readonly ScoredFunction[]): string {
  return JSON.stringify(scored, null, 2);
}
