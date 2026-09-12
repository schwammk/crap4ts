export type Risk = 'low' | 'moderate' | 'high' | 'unknown';

export interface ScoredFunction {
  file: string;
  name: string;
  cc: number;
  coverage: number | null;
  crap: number | null;
  risk: Risk;
}

export function crapScore(cc: number, coverage: number | null): number | null {
  if (coverage === null) return null;
  return cc * cc * Math.pow(1 - coverage, 3) + cc;
}

export function riskBand(crap: number | null): Risk {
  if (crap === null) return 'unknown';
  if (crap <= 5) return 'low';
  if (crap <= 30) return 'moderate';
  return 'high';
}
