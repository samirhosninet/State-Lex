# Shadow State — Master Architecture Index (Single Source of Truth)

**Project**: Shadow State (Browser-Only Geopolitical Strategy Simulation MVP: El Alamein & Ras El Hekma)  
**Document Status**: Canonical Architectural Authority (v1.0.0 Freeze)  

---

## 1. System Vision & MVP Scope

### 1.1 System Vision
Shadow State is a client-side, browser-only geopolitical strategy simulation MVP designed for deterministic turn processing, pure offline-first local persistence, and read-only asynchronous LLM narrative integration.

### 1.2 MVP Scope Limits (Strictly Locked)
- **Playable Regions**: Exactly two regions — **El Alamein** and **Ras El Hekma**.
- **Playable Factions**: Exactly two competing factions (Faction Alpha vs Faction Beta).
- **Engine Execution**: 100% browser-only client runtime with turn-based deterministic tick calculation.
- **Local Persistence**: Offline-first IndexedDB storage with automatic fallback to volatile memory.
- **LLM Narrative**: Read-only qualitative narrative generator (`LLMNarrative`) carrying immutable `TurnNumber` validation tags.

### 1.3 Explicit Non-Goals
- ZERO backend server infrastructure or database microservices.
- ZERO multiplayer networking or WebSockets.
- ZERO LLM access to domain mutation methods.
- ZERO floating-point arithmetic inside domain simulation code.

---

## 2. Architecture Layer & Port Ownership

```
┌───────────────────────────────────────────────────────────────────────────┐
│ PRESENTATION LAYER (src/presentation/)                                    │
│  - React UI View Presenters                                              │
│  - main.ts Composition Root Wiring                                       │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │ Invokes Primary Port
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ APPLICATION LAYER (src/application/)                                      │
│  - Primary Port: IGameApplicationService                                  │
│  - Secondary Ports: IPersistencePort, ILLMProviderPort, IRendererPort    │
│  - Use Cases: StartGameUseCase, ProcessTurnUseCase                        │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │ Invokes Pure ES Logic
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ PURE DOMAIN LAYER (src/domain/) [Zero External Imports - Mandate M-01]     │
│  - Aggregates: GameState, Faction                                         │
│  - Entities: Region, TurnAction                                           │
│  - Value Objects: TurnSeed, TurnNumber, FixedPointResourcePool            │
└─────────────────────────────────────┴─────────────────────────────────────┘
                                      ▲
                                      │ Implements Secondary Ports
┌─────────────────────────────────────┴─────────────────────────────────────┐
│ INFRASTRUCTURE LAYER (src/infrastructure/)                                │
│  - IndexedDBStorageAdapter & MemoryStorageAdapter (IPersistencePort)      │
│  - FetchCustomLLMAdapter & MockLLMAdapter (ILLMProviderPort)              │
│  - PixiJSCanvasAdapter (IRendererPort)                                    │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 3. ADR Registry

- 🔹 [ADR-001: Hexagonal Architecture](adr/ADR-001-hexagonal-architecture.md) — Layer isolation & ports
- 🔹 [ADR-002: Seed-Based Deterministic PRNG](adr/ADR-002-seeded-prng-determinism.md) — Mulberry32 PRNG engine
- 🔹 [ADR-003: Asynchronous LLM Isolation](adr/ADR-003-async-llm-isolation.md) — Read-only narrative & 3s circuit breaker
- 🔹 [ADR-004: Fixed-Point Integer Arithmetic](adr/ADR-004-fixed-point-arithmetic.md) — BigInt resource pool
- 🔹 [ADR-005: Atomic Persistence & Fallback](adr/ADR-005-atomic-persistence-fallback.md) — IndexedDB `.tmp` swap

---

## 4. Executable Task Registry (Locked to Exactly 22 Tasks)

- **Phase 0**: Tasks `TASK-001` & `TASK-002` (Setup & AST Linter Rule)
- **Phase 1**: Tasks `TASK-003` to `TASK-005` (Domain Core Aggregates & PRNG)
- **Phase 2**: Tasks `TASK-006` & `TASK-007` (Application Use Cases & Primary Port)
- **Phase 3**: Tasks `TASK-008` to `TASK-014` (Infrastructure Adapters)
- **Phase 4**: Task `TASK-015` (React UI View Components)
- **Phase 5**: Task `TASK-016` (Composition Root & Bundle Assembly)
- **Phase 6**: Tasks `TASK-017` to `TASK-019` (Integration Test Suite)
- **Phase 7**: Task `TASK-020` (Performance Profiling & Memory Audit)
- **Phase 8**: Task `TASK-021` (CI Pipeline Integration)
- **Phase 9**: Task `TASK-022` (Documentation & Release Tagging)

---

## 5. Master Architecture Acceptance & Verification Suite

- ✅ [Final Architecture Acceptance Audit](final_architecture_acceptance_audit.md) — Acceptance Audit (**APPROVED FOR CODE GENERATION**)
- 🏛️ [Independent Principal Architecture Review Board Report](independent_principal_architecture_review_board_report.md) — Review Audit
- 🔬 [Master Self-Verification & Evidence Validation Report](self_verification_report.md) — Verification Audit
- 🎯 [Requirements Traceability Matrix](requirements_traceability_matrix.md) — 100% Traceability
- 🔌 [Canonical Port Contracts](port_contracts.md) — Interface Contracts
- 🧩 [Domain Model Specification](domain_model_specification.md) — Domain Specification
