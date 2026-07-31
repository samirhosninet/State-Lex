# Shadow State — Architecture Fitness Function Specification

**Project**: Shadow State (Browser-Only Geopolitical Strategy Simulation MVP)  
**Document Status**: Specification & Automated Test Rule Contracts (Zero Code Mode)

---

## 1. Domain Purity & Boundary Isolation Fitness Functions

### FF-01: Zero External Framework Imports in Core (`test:fitness-purity`)
- **Target Path**: `src/domain/**/*`
- **Rule**: Parse AST of all files in `src/domain/`. Reject any file containing imports of `react`, `pixi.js`, `indexeddb`, `fetch`, `window`, `document`, `Math.random`, or `Date.now`.
- **Enforcement Script**: Executed by `TASK-002` and `TASK-021` in CI pipeline.

### FF-02: Fixed-Point Arithmetic Enforcement (`test:fixed-point`)
- **Target Path**: `src/domain/values/FixedPointResourcePool.ts`
- **Rule**: Verify resource calculations use `BigInt` operations. Reject floating-point division (`/`) or `Math.floor`.

---

## 2. Quality & Maintainability Fitness Functions

| Fitness Function ID | Quality Metric | Target Threshold | Automated Tool |
| :--- | :--- | :--- | :--- |
| **FF-03** | Cyclomatic Complexity | Max complexity <= 10 per function | ESLint `complexity` rule |
| **FF-04** | Client Bundle Size | Total client bundle <= 500KB gzipped | Vite Bundle Analyzer |
| **FF-05** | Dead Code / Unused Exports | 0 unused exports | `ts-prune` / Knip |
| **FF-06** | Test Coverage (Domain) | 100% Branch Coverage in `src/domain/` | Vitest Coverage Reporter |

---

## 3. Performance & Memory Fitness Functions (Specification Rules)

- **FF-07 (Turn Tick Latency)**: Domain tick execution must complete in `< 16ms` CPU time for 100 consecutive turns.
- **FF-08 (Memory Heap Footprint)**: Heap memory usage must remain `< 150MB` after 200 turn ticks.
