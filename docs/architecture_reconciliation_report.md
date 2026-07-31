# Shadow State — Architecture Reconciliation Report (v1.1 Baseline)

**Project**: Shadow State (Browser-Only Geopolitical Strategy Simulation MVP: El Alamein & Ras El Hekma)  
**Role**: Principal Software Architect  
**Operating Mode**: Architecture Reconciliation Sprint (0.0% Source Code)  
**Baseline Target**: **Executable Architecture Freeze Specification Baseline v1.1**

---

## 1. Conflict Registry

The Architecture Reconciliation Sprint conducted a fresh audit across all architectural specifications to register and resolve all historical documentation discrepancies:

| Conflict ID | Severity | Conflict Description | Affected Files | Resolution Strategy | SSoT Authority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CR-01** | Medium | Task Count Variation (22 vs 28 tasks) | `tasks.md`, historical reports | Locked task registry to **EXACTLY 22 TASKS** (`TASK-001` - `TASK-022`). Purged all references to 28 tasks. | `docs/task_registry_lock.md` |
| **CR-02** | Low | Naming Ambiguity (`ResourcePool` vs `FixedPointResourcePool`) | `architecture_package.md`, `glossary.md` | Unified under single canonical name `FixedPointResourcePool` (**ADR-004**). | `docs/domain_model_specification.md` |
| **CR-03** | Low | Legacy Port References (`IGameStateRepository`, `IEventPublisherPort`) | Historical plan files | Clarified as internal implementation details; locked exactly 4 external ports. | `docs/port_contracts.md` |
| **CR-04** | Low | Machine-Specific File URIs | Audit logs | Replaced all local machine `file:///` URIs with GitHub-portable relative links. | Link Portability Standard |

*Conflict Status*: **100% Resolved. 0 active conflicts remain in Specification Baseline v1.1.**

---

## 2. Single Source of Truth (SSoT) Governance Hierarchy

The repository enforces a strict 6-level authority hierarchy. If any document contradicts a higher level, the higher level prevails:

```
┌───────────────────────────────────────────────────────────────────────────┐
│ LEVEL 1: constitution.md (Supreme Governing Law & Phase Gates)            │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ LEVEL 2: architecture_index.md (Master Architecture SSoT & Scope Limits)  │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ LEVEL 3: docs/adr/ (Standalone ADRs ADR-001 through ADR-005)              │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ LEVEL 4: docs/domain_model_specification.md (Domain Model Lock)           │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ LEVEL 5: docs/port_contracts.md (Application & Infrastructure Ports)     │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ LEVEL 6: docs/tasks.md & task_registry_lock.md (22 Executable Tasks)       │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Domain Model Lock (v1.1 Baseline)

### 3.1 Entities
- **`GameState`** (Aggregate Root): `id: string`, `turnNumber: TurnNumber`, `turnSeed: TurnSeed`, `factions: Map<string, Faction>`, `regions: Map<string, Region>`, `actionLog: ReadonlyArray<TurnAction>`.
- **`Faction`** (Aggregate Root): `id: FactionId`, `name: string`, `resources: FixedPointResourcePool`, `controlledRegionIds: ReadonlyArray<RegionId>`.
- **`Region`** (Entity): `id: RegionId` (`'EL_ALAMEIN' | 'RAS_EL_HEKMA'`), `name: string`, `controllerFactionId: FactionId`, `infrastructureLevel: number`, `defenseLevel: number`.
- **`TurnAction`** (Entity): `id: string`, `factionId: FactionId`, `targetRegionId: RegionId`, `actionType: 'DEVELOP' | 'FORTIFY' | 'REDEPLOY'`.

### 3.2 Value Objects
- **`TurnNumber`**: `value: number` (Monotonic positive integer incremented by +1).
- **`TurnSeed`**: `value: number` (32-bit unsigned integer consumed by Mulberry32 PRNG).
- **`FixedPointResourcePool`**: `baseUnits: bigint` (Scaled BigInt, 1 unit = 100 base units; 0 float drift).
- **`LLMNarrative`**: `turnNumber: number`, `text: string`, `isFallback: boolean` (Carries immutable `turnNumber` tag).

---

## 4. Port Contract Lock (Exactly 4 Ports)

1. **`IGameApplicationService`** (Primary Driving Port)
2. **`IPersistencePort`** (Secondary Driven Persistence Port)
3. **`ILLMProviderPort`** (Secondary Driven LLM Narrative Port)
4. **`IRendererPort`** (Secondary Driven PixiJS Canvas Renderer Port)

*Orphan & Legacy Ports*: `IGameStateRepository` and `IEventPublisherPort` are formally declared non-port internal domain patterns.

---

## 5. Task Registry Lock (Exactly 22 Tasks)

The task registry is locked to **EXACTLY 22 TASKS** (`TASK-001` through `TASK-022`) spanning 10 execution phases (Phases 0–9). Detailed definitions are published in `docs/task_registry_lock.md`.

---

## 6. Reconciliation Summary Verdict

Reconciliation Sprint v1.1 is complete. All 39 documentation files are unified under the 6-tier SSoT hierarchy. Baseline v1.1 is ratified and locked.
