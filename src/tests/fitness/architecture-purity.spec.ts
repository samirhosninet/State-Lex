import { describe, it, expect } from 'vitest';
import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

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

export function checkFileArchitecturePurity(filePath: string, code: string): string[] {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const violations: string[] = [];

  const sourceFile = ts.createSourceFile(
    filePath,
    code,
    ts.ScriptTarget.Latest,
    true
  );

  function checkNode(node: ts.Node): void {
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = (node.moduleSpecifier as ts.StringLiteral).text;

      // Rule 1: Presentation MUST NOT import Domain Aggregates (GameState, Faction, Region)
      if (normalizedPath.includes('/src/presentation/')) {
        if (
          moduleSpecifier.includes('/domain/aggregates/') ||
          moduleSpecifier.includes('/domain/entities/Region') ||
          moduleSpecifier.includes('/domain/entities/Faction')
        ) {
          violations.push(`Rule 1 Violation: Presentation file '${path.basename(filePath)}' imports Domain Aggregate '${moduleSpecifier}'`);
        }
      }

      // Rule 2: Application MUST NOT depend on Presentation
      if (normalizedPath.includes('/src/application/')) {
        if (moduleSpecifier.includes('/presentation/')) {
          violations.push(`Rule 2 Violation: Application file '${path.basename(filePath)}' imports Presentation layer '${moduleSpecifier}'`);
        }
      }

      // Rule 3: Domain MUST NOT depend on Presentation
      if (normalizedPath.includes('/src/domain/')) {
        if (moduleSpecifier.includes('/presentation/')) {
          violations.push(`Rule 3 Violation: Domain file '${path.basename(filePath)}' imports Presentation layer '${moduleSpecifier}'`);
        }
      }

      // Rule 4: Domain MUST NOT depend on Infrastructure
      if (normalizedPath.includes('/src/domain/')) {
        if (moduleSpecifier.includes('/infrastructure/')) {
          violations.push(`Rule 4 Violation: Domain file '${path.basename(filePath)}' imports Infrastructure layer '${moduleSpecifier}'`);
        }
      }
    }
    ts.forEachChild(node, checkNode);
  }

  checkNode(sourceFile);
  return violations;
}

describe('TASK-014A Architecture Fitness Rules (AST Boundary Enforcement)', () => {
  const srcDir = path.resolve(process.cwd(), 'src');
  const allFiles = getAllTsFiles(srcDir);

  it('all codebase TypeScript files strictly satisfy Clean Architecture layer purity rules', () => {
    const allViolations: string[] = [];
    allFiles.forEach((filePath) => {
      const code = fs.readFileSync(filePath, 'utf-8');
      const fileViolations = checkFileArchitecturePurity(filePath, code);
      allViolations.push(...fileViolations);
    });

    expect(allViolations).toEqual([]);
  });

  describe('Architecture Fitness Invariant Self-Verification (Failure Detection Test)', () => {
    it('Rule 1: Rejects Presentation file if it illegally imports Domain Aggregates directly', () => {
      const badPresentationPath = path.resolve(process.cwd(), 'src/presentation/BadView.ts');
      const badCode = `import { GameState } from '../domain/aggregates/GameState';`;
      const violations = checkFileArchitecturePurity(badPresentationPath, badCode);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0]).toContain('Rule 1 Violation');
    });

    it('Rule 2: Rejects Application file if it illegally imports Presentation layer', () => {
      const badAppPath = path.resolve(process.cwd(), 'src/application/usecases/BadUseCase.ts');
      const badCode = `import { GameView } from '../../presentation/GameView';`;
      const violations = checkFileArchitecturePurity(badAppPath, badCode);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0]).toContain('Rule 2 Violation');
    });

    it('Rule 3: Rejects Domain file if it illegally imports Presentation layer', () => {
      const badDomainPath = path.resolve(process.cwd(), 'src/domain/services/BadService.ts');
      const badCode = `import { GameView } from '../../presentation/GameView';`;
      const violations = checkFileArchitecturePurity(badDomainPath, badCode);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0]).toContain('Rule 3 Violation');
    });

    it('Rule 4: Rejects Domain file if it illegally imports Infrastructure layer', () => {
      const badDomainPath = path.resolve(process.cwd(), 'src/domain/services/BadService.ts');
      const badCode = `import { IndexedDBStorageAdapter } from '../../infrastructure/persistence/IndexedDBStorageAdapter';`;
      const violations = checkFileArchitecturePurity(badDomainPath, badCode);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0]).toContain('Rule 4 Violation');
    });
  });
});
