# Shadow State — Task Registry Lock (v1.1 Baseline)

**Project**: Shadow State (Browser-Only Geopolitical Strategy Simulation MVP)  
**Document Status**: Canonical Task Registry SSoT (Locked to Exactly 22 Tasks)  

---

## Task Inventory (TASK-001 through TASK-022)

| Task ID | Phase | Task Purpose | Dependencies | Target Files | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TASK-001** | Phase 0 | Initialize Vite, TypeScript & Strict Linters | None | `package.json`, `tsconfig.json`, `vite.config.ts` | `npm run build` compiles with 0 errors |
| **TASK-002** | Phase 0 | Implement M-01 AST Fitness Function Linter Rule | `TASK-001` | `src/tests/fitness/domain-purity.spec.ts` | AST linter flags forbidden imports |
| **TASK-003** | Phase 1 | Implement Value Objects (`RegionId`, `FactionId`, `TurnSeed`, `TurnNumber`) | `TASK-002` | `src/domain/values/*` | Reject invalid instantiations |
| **TASK-004** | Phase 1 | Implement `FixedPointResourcePool` (ADR-004) | `TASK-003` | `src/domain/values/FixedPointResourcePool.ts` | 0 floating-point rounding drift |
| **TASK-005** | Phase 1 | Implement Seeded PRNG Engine (ADR-002) | `TASK-003` | `src/domain/services/PRNGService.ts` | Seed `0xDEADBEEF` hash match |
| **TASK-006** | Phase 1 | Implement `Region` & `TurnAction` Entities | `TASK-003` | `src/domain/entities/*` | Immutable entity mutations |
| **TASK-007** | Phase 1 | Implement `Faction` & `GameState` Aggregates | `TASK-004`, `TASK-006` | `src/domain/aggregates/*` | Aggregate root invariant enforcement |
| **TASK-008** | Phase 2 | Implement `StartGameUseCase` Use Case | `TASK-007` | `src/application/usecases/StartGameUseCase.ts` | Returns initial `GameStateDTO` |
| **TASK-009** | Phase 2 | Implement `ProcessTurnUseCase` Use Case | `TASK-005`, `TASK-007` | `src/application/usecases/ProcessTurnUseCase.ts` | Increments turn & ticks state |
| **TASK-010** | Phase 2 | Implement Application Layer DTO Mappers | `TASK-008`, `TASK-009` | `src/application/dtos/*` | Bi-directional DTO mapping |
| **TASK-011** | Phase 3 | Implement `MemoryStorageAdapter` | `TASK-010` | `src/infrastructure/persistence/MemoryStorageAdapter.ts` | Volatile in-memory snapshot store |
| **TASK-012** | Phase 3 | Implement `IndexedDBStorageAdapter` (ADR-005) | `TASK-011` | `src/infrastructure/persistence/IndexedDBStorageAdapter.ts` | `.tmp` key swap & BigInt serializer |
| **TASK-013** | Phase 3 | Implement `FetchCustomLLMAdapter` & `MockLLMAdapter` (ADR-003) | `TASK-010` | `src/infrastructure/llm/*` | 3s circuit breaker & `TurnNumber` tag |
| **TASK-014** | Phase 3 | Implement `PixiJSCanvasAdapter` | `TASK-010` | `src/infrastructure/rendering/PixiJSCanvasAdapter.ts` | Render El Alamein & Ras El Hekma |
| **TASK-015** | Phase 4 | Implement React UI Control & Presentation Components | `TASK-008`–`TASK-014` | `src/presentation/components/*` | Dispatches via `IGameApplicationService` |
| **TASK-016** | Phase 5 | Assemble `main.ts` Composition Root & Vite Bundle | `TASK-015` | `src/presentation/main.ts` | Complete client app boot |
| **TASK-017** | Phase 6 | Implement Determinism Integration Test Suite | `TASK-016` | `src/tests/integration/determinism.spec.ts` | 500-turn seed hash identity |
| **TASK-018** | Phase 6 | Implement Persistence Fallback Integration Test | `TASK-016` | `src/tests/integration/persistence.spec.ts` | Quota rejection falls back to memory |
| **TASK-019** | Phase 6 | Implement LLM Isolation & Stale Tag Test Suite | `TASK-016` | `src/tests/integration/llm.spec.ts` | Drop stale `TurnNumber` tags |
| **TASK-020** | Phase 7 | Execute Performance Profiling & Memory Audit | `TASK-016` | `src/tests/performance/profiling.spec.ts` | `< 16ms` CPU time, `< 150MB` RAM |
| **TASK-021** | Phase 8 | Integrate Automated CI Pipeline | `TASK-017`–`TASK-020` | `.github/workflows/ci.yml` | `npm run test:fitness` in CI |
| **TASK-022** | Phase 9 | Complete Release Documentation & Freeze Tag v1.0 | `TASK-021` | `docs/*` | Final v1.0 release sign-off |
