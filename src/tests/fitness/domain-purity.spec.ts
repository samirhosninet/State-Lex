import { describe, it, expect } from 'vitest';
import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

export function analyzeSourcePurity(filePath: string, code: string): string[] {
  const isDomainFile = filePath.replace(/\\/g, '/').includes('/src/domain/');
  if (!isDomainFile) {
    // Rule is strictly scoped to src/domain/ files only
    return [];
  }

  const sourceFile = ts.createSourceFile(
    filePath,
    code,
    ts.ScriptTarget.Latest,
    true
  );

  const forbiddenSymbols: string[] = [];

  function checkNode(node: ts.Node): void {
    // AST Node: Check Import Declarations
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = (node.moduleSpecifier as ts.StringLiteral).text;
      if (!moduleSpecifier.startsWith('.')) {
        forbiddenSymbols.push(`Import of external package '${moduleSpecifier}'`);
      } else if (moduleSpecifier.includes('/application/') || moduleSpecifier.includes('/infrastructure/') || moduleSpecifier.includes('/presentation/')) {
        forbiddenSymbols.push(`Upward dependency import '${moduleSpecifier}'`);
      }
    }

    // AST Node: Check Property Access Expressions (e.g. Math.random, Date.now)
    if (ts.isPropertyAccessExpression(node)) {
      const expressionText = node.expression.getText(sourceFile);
      const nameText = node.name.getText(sourceFile);

      if (expressionText === 'Math' && nameText === 'random') {
        forbiddenSymbols.push('Math.random() call');
      }
      if (expressionText === 'Date' && nameText === 'now') {
        forbiddenSymbols.push('Date.now() call');
      }
      if (expressionText === 'window' || expressionText === 'document' || expressionText === 'localStorage' || expressionText === 'indexedDB') {
        forbiddenSymbols.push(`DOM/Browser global reference '${expressionText}.${nameText}'`);
      }
    }

    // AST Node: Check Identifier Expressions (e.g. fetch, window, document)
    if (ts.isIdentifier(node)) {
      const text = node.getText(sourceFile);
      if ((text === 'fetch' || text === 'window' || text === 'document' || text === 'localStorage' || text === 'indexedDB') &&
          !ts.isPropertyAccessExpression(node.parent) &&
          !ts.isTypeReferenceNode(node.parent)) {
        forbiddenSymbols.push(`Forbidden global identifier '${text}'`);
      }
    }

    // AST Node: Check New Expressions (e.g. new Date())
    if (ts.isNewExpression(node)) {
      const expressionText = node.expression.getText(sourceFile);
      if (expressionText === 'Date') {
        forbiddenSymbols.push('new Date() instantiation');
      }
    }

    ts.forEachChild(node, checkNode);
  }

  checkNode(sourceFile);
  return forbiddenSymbols;
}

function getAllTsFiles(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllTsFiles(filePath));
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      results.push(filePath);
    }
  }
  return results;
}

describe('Mandate M-01 AST Domain Purity Fitness Function', () => {
  const domainDir = path.resolve(process.cwd(), 'src/domain');
  const domainFiles = getAllTsFiles(domainDir);

  it('domain directory exists and contains source files', () => {
    expect(domainFiles.length).toBeGreaterThan(0);
  });

  domainFiles.forEach((filePath) => {
    const relativePath = path.relative(process.cwd(), filePath);

    it(`file '${relativePath}' adheres to 100% pure domain boundaries`, () => {
      const code = fs.readFileSync(filePath, 'utf-8');
      const violations = analyzeSourcePurity(filePath, code);
      expect(violations, `Domain purity violations found in ${relativePath}:\n${violations.join('\n')}`).toEqual([]);
    });
  });

  describe('Rule Scoping Verification Suite (Mandate M-01 Full Coverage)', () => {
    const mockDomainPath = path.resolve(process.cwd(), 'src/domain/services/MockService.ts');
    const mockAppPath = path.resolve(process.cwd(), 'src/application/usecases/MockUseCase.ts');

    // 1. Math.random
    it('Math.random(): Positive inside src/domain (rejected) & Negative outside (accepted)', () => {
      const code = `export function roll(): number { return Math.random(); }`;
      expect(analyzeSourcePurity(mockDomainPath, code)).toContain('Math.random() call');
      expect(analyzeSourcePurity(mockAppPath, code)).toEqual([]);
    });

    // 2. Date.now
    it('Date.now(): Positive inside src/domain (rejected) & Negative outside (accepted)', () => {
      const code = `export function now(): number { return Date.now(); }`;
      expect(analyzeSourcePurity(mockDomainPath, code)).toContain('Date.now() call');
      expect(analyzeSourcePurity(mockAppPath, code)).toEqual([]);
    });

    // 3. new Date()
    it('new Date(): Positive inside src/domain (rejected) & Negative outside (accepted)', () => {
      const code = `export function today(): Date { return new Date(); }`;
      expect(analyzeSourcePurity(mockDomainPath, code)).toContain('new Date() instantiation');
      expect(analyzeSourcePurity(mockAppPath, code)).toEqual([]);
    });

    // 4. fetch
    it('fetch(): Positive inside src/domain (rejected) & Negative outside (accepted)', () => {
      const code = `export async function loadData() { return fetch('/api'); }`;
      expect(analyzeSourcePurity(mockDomainPath, code)).toContain("Forbidden global identifier 'fetch'");
      expect(analyzeSourcePurity(mockAppPath, code)).toEqual([]);
    });

    // 5. DOM globals (window / document)
    it('DOM globals (window/document): Positive inside src/domain (rejected) & Negative outside (accepted)', () => {
      const codeWindow = `export function getWidth() { return window.innerWidth; }`;
      const codeDoc = `export function getElem() { return document.getElementById('root'); }`;

      expect(analyzeSourcePurity(mockDomainPath, codeWindow)).toContain("DOM/Browser global reference 'window.innerWidth'");
      expect(analyzeSourcePurity(mockDomainPath, codeDoc)).toContain("DOM/Browser global reference 'document.getElementById'");

      expect(analyzeSourcePurity(mockAppPath, codeWindow)).toEqual([]);
      expect(analyzeSourcePurity(mockAppPath, codeDoc)).toEqual([]);
    });
  });
});

