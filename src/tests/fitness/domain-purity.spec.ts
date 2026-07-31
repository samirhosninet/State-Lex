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

  describe('Rule Scoping Verification Suite', () => {
    it('Positive Test: src/domain/... + Math.random() is rejected', () => {
      const mockDomainPath = path.resolve(process.cwd(), 'src/domain/services/MockService.ts');
      const mockCode = `export function roll(): number { return Math.random(); }`;
      const violations = analyzeSourcePurity(mockDomainPath, mockCode);
      expect(violations).toContain('Math.random() call');
    });

    it('Negative Test: src/application/... + Math.random() is accepted (outside domain scope)', () => {
      const mockAppPath = path.resolve(process.cwd(), 'src/application/usecases/MockUseCase.ts');
      const mockCode = `export function roll(): number { return Math.random(); }`;
      const violations = analyzeSourcePurity(mockAppPath, mockCode);
      expect(violations).toEqual([]);
    });

    it('Negative Test: src/infrastructure/... + Math.random() is accepted (outside domain scope)', () => {
      const mockInfraPath = path.resolve(process.cwd(), 'src/infrastructure/adapters/MockAdapter.ts');
      const mockCode = `export function roll(): number { return Math.random(); }`;
      const violations = analyzeSourcePurity(mockInfraPath, mockCode);
      expect(violations).toEqual([]);
    });
  });
});

