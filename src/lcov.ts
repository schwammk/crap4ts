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
      throw new Error(`malformed LCOV record in ${sourceName} (record ${recordNo + 1}): "${line}"`);
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
    throw new Error(`malformed LCOV record in ${sourceName} (record ${recordNo + 1}): "${line}"`);
  }
  return files;
}
