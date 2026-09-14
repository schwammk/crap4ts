import { describe, expect, it } from 'vitest';
import { renderText, renderJson } from '../src/report.js';
import type { ScoredFunction } from '../src/crap.js';

const f = (over: Partial<ScoredFunction>): ScoredFunction => ({
  file: 'src/a.ts',
  name: 'add',
  cc: 2,
  startLine: 1,
  endLine: 2,
  coverage: 1,
  crap: 2,
  risk: 'low',
  ...over,
});

describe('renderText', () => {
  it('sorts worst-first with N/A last', () => {
    const rows = [f({}), f({ name: 'boom', cc: 6, coverage: 0, crap: 42, risk: 'high' }), f({ name: 'ghost', coverage: null, crap: null, risk: 'unknown' })];
    const text = renderText(rows);
    const lines = text.trimEnd().split('\n');
    expect(lines[0]).toContain('Function');
    expect(lines[1]).toContain('boom');
    expect(lines[1]).toContain('42.00');
    expect(lines[2]).toContain('add');
    expect(lines[lines.length - 1]).toContain('ghost');
    expect(lines[lines.length - 1]).toContain('N/A');
  });

  it('renders coverage as percent', () => {
    const text = renderText([f({ coverage: 0 })]);
    expect(text).toContain('0');
  });
});

describe('renderJson', () => {
  it('emits the scored array as JSON', () => {
    const rows = [f({})];
    expect(JSON.parse(renderJson(rows))).toEqual(rows);
  });
});
