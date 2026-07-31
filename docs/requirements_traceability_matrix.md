# Shadow State — Requirements Traceability Matrix

**Project**: Shadow State (Browser-Only Geopolitical Strategy Simulation MVP)  
**Document Status**: Ratified Architecture Evidence  

---

| Requirement ID | Requirement Description | Use Case | ADR / Mandate | Architecture Component | Port Interface | Task ID | Acceptance Criteria | Fitness Function |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-01** | Browser-Only Runtime | `StartGameUseCase` | ADR-001 | Client Bundle | `IGameApplicationService` | `TASK-001`, `TASK-016` | Zero backend calls; standalone bundle | `test:bundle-isolation` |
| **REQ-02** | Seed-Based Determinism | `ProcessTurnUseCase` | ADR-002 | Mulberry32 PRNG | `IGameApplicationService` | `TASK-005`, `TASK-017` | Seed `0xDEADBEEF` hash match across 500 ticks | `test:determinism` |
| **REQ-03** | Fixed-Point Resource Pool | `ProcessTurnUseCase` | ADR-004 | `FixedPointResourcePool` | `IGameApplicationService` | `TASK-004` | 0 floating-point rounding drift across JS engines | `test:fixed-point` |
| **REQ-04** | Pure Domain Isolation | N/A (Core Layer) | M-01 | Domain Core (`src/domain/`) | N/A | `TASK-002`, `TASK-021` | AST linter flags forbidden imports | `test:fitness-purity` |
| **REQ-05** | Atomic Local Persistence | `SaveGameUseCase` | ADR-005 | `IndexedDBStorageAdapter` | `IPersistencePort` | `TASK-012`, `TASK-018` | `.tmp` key swap; fallback to `MemoryStorageAdapter` | `test:storage-atomic` |
| **REQ-06** | Asynchronous LLM Narrative | `GenerateNarrativeUseCase` | M-02 & ADR-003 | `FetchCustomLLMAdapter` | `ILLMProviderPort` | `TASK-013`, `TASK-019` | 3s circuit breaker; drop stale `TurnNumber` tags | `test:llm-isolation` |
| **REQ-07** | PixiJS Map Render | `RenderMapUseCase` | ADR-001 | `PixiJSCanvasAdapter` | `IRendererPort` | `TASK-014` | Visual map renders El Alamein & Ras El Hekma | `test:render-decoupling` |
| **REQ-08** | React UI Control View | `PresentUIUseCase` | ADR-001 | Passive View Presenters | `IGameApplicationService` | `TASK-015` | UI dispatches commands through Application Service | `test:ui-decoupling` |

*Traceability Audit Result*: 100% of requirements map directly down to Fitness Functions and Task IDs. Zero orphan requirements.
