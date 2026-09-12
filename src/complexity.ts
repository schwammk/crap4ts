import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { listSourceFiles } from './walk.js';

export interface CollectedFunction {
  file: string;
  name: string;
  cc: number;
  startLine: number;
}

const FUNCTION_LIKE = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.Constructor,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor,
]);

export function isFunctionLike(node: ts.Node): boolean {
  return FUNCTION_LIKE.has(node.kind);
}

function enclosingClassName(node: ts.Node): string | undefined {
  let cur: ts.Node | undefined = node.parent;
  while (cur) {
    if (ts.isClassDeclaration(cur) || ts.isClassExpression(cur)) return cur.name?.text;
    cur = cur.parent;
  }
  return undefined;
}

function functionNameOf(node: ts.Node, sf: ts.SourceFile): string {
  if (ts.isConstructorDeclaration(node)) {
    const cls = enclosingClassName(node);
    return cls ? `${cls}.constructor` : 'constructor';
  }
  const named = (node as ts.FunctionLikeDeclaration).name;
  if (named && ts.isIdentifier(named)) {
    const cls = enclosingClassName(node);
    return cls ? `${cls}.${named.text}` : named.text;
  }
  const p = node.parent;
  if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
  if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)) return p.name.text;
  if (ts.isPropertyDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
  const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
  return `<anonymous:${line + 1}>`;
}

export function computeComplexity(sourceText: string, filePath: string): CollectedFunction[] {
  const sf = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.ES2022, true);
  const out: CollectedFunction[] = [];
  const lineOf = (node: ts.Node): number =>
    sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
  const walk = (node: ts.Node): void => {
    if (isFunctionLike(node)) {
      out.push({
        file: filePath,
        name: functionNameOf(node, sf),
        cc: 1,
        startLine: lineOf(node),
      });
      ts.forEachChild(node, walk);
      return;
    }
    ts.forEachChild(node, walk);
  };
  walk(sf);
  return out;
}

export function collectFunctions(sourceRoot: string): CollectedFunction[] {
  const out: CollectedFunction[] = [];
  for (const file of listSourceFiles(sourceRoot)) {
    out.push(...computeComplexity(readFileSync(file, 'utf8'), file));
  }
  return out.sort((a, b) => a.file.localeCompare(b.file) || a.startLine - b.startLine);
}
