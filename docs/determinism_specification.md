# Shadow State — Deterministic Turn Contract Specification (SS-002)

**Project**: Shadow State (Browser-Only Geopolitical Strategy Simulation MVP)  
**Document Status**: Ratified Architecture Contract Baseline (v1.1 SSoT — **ADR-002** & **ADR-004**)  
**Scope**: Domain Simulation Engine & Application Turn Orchestration Contract  

---

## 1. Turn Execution Contract

The turn simulation tick is defined as a pure, side-effect-free mathematical transformation.

### 1.1 Signature & Types
```typescript
export interface PRNGTraceEntry {
  readonly location: string;
  readonly orderIndex: number;
  readonly purpose: string;
  readonly value: number;
}

export interface TurnExecutionInput {
  readonly state: GameStateSnapshotDTO;
  readonly actions: ReadonlyArray<TurnActionDTO>;
  readonly seed: TurnSeedDTO;
  readonly turnNumber: TurnNumberDTO;
}

export interface TurnExecutionResult {
  readonly nextState: GameStateSnapshotDTO;
  readonly metadata: TurnResultMetadataDTO;
  readonly stateHash: string;
}

export interface TurnResultMetadataDTO {
  readonly turnNumber: number;
  readonly executedActionIds: ReadonlyArray<string>;
  readonly rejectedActionIds: ReadonlyArray<string>;
  readonly prngCallsCount: number;
  readonly debugTrace?: ReadonlyArray<PRNGTraceEntry>;
}
```

### 1.2 Deterministic Execution Guarantees
1. **Pure Function Contract**: `ProcessTurnUseCase` and `PRNGService` operate as pure functions. Given identical `(state, actions, seed, turnNumber)` inputs, the engine MUST yield byte-for-byte identical `nextState` DTOs and `stateHash` outputs.
2. **Zero Hidden State**: Access to `Date.now()`, `Math.random()`, process state, hardware clocks, DOM properties, or network conditions inside `src/domain/` is strictly forbidden and enforced by AST fitness linter (`TASK-002`).
3. **Execution Order**:
   1. Receive and validate command payload DTOs against current state invariants.
   2. Sort validated actions deterministically (alphabetically by `actionId`).
   3. Initialize PRNG state using canonical seed derivation: `(TurnSeed.value + TurnNumber.value) >>> 0`.
   4. Resolve action effects sequentially (deducting costs from `FixedPointResourcePool`).
   5. Execute regional simulation tick (resource generation & stability check).
   6. Construct new immutable `GameState` aggregate root.
   7. Increment `TurnNumber` by strictly `+1`.
   8. Execute `canonicalizeDeep(nextState)` and compute canonical SHA-256 state hash.

---

## 2. PRNG Ownership & Consumption Contract

### 2.1 Single Authoritative Owner
- **Owner**: `PRNGService` (`src/domain/services/PRNGService.ts`).
- **Algorithm**: Pure 32-bit **Mulberry32 PRNG**:
```typescript
export function mulberry32(a: number): () => number {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

### 2.2 Canonical Seed Derivation & Lifecycle
- Game session begins with a 32-bit `TurnSeed` value object (e.g. `0xDEADBEEF`).
- For turn $N$, the PRNG generator is initialized using the single canonical derivation formula:
$$\text{seed}_N = (\text{TurnSeed.value} + \text{TurnNumber.value}) \gg\gg 0$$
- PRNG instance is created at the start of turn tick and discarded upon turn completion.

### 2.3 Strict Declared Consumption Sequence
Random events consume PRNG values in exact, immutable order:
1. **Action Resolution Order**: Evaluated for actions requiring random outcome checks, ordered alphabetically by `action.id`.
2. **Region Event Sequence**: Evaluated strictly in canonical region order: `"EL_ALAMEIN"` then `"RAS_EL_HEKMA"`.
3. **Faction Stability Sequence**: Evaluated strictly in canonical faction order: `"FACTION_ALPHA"` then `"FACTION_BETA"`.

Every PRNG consumption call logs an optional `PRNGTraceEntry` containing `[location, orderIndex, purpose, value]`.

### 2.4 Trace Isolation (Zero Side-Effects)
- `debugTrace` is attached exclusively to `TurnResultMetadataDTO`.
- `debugTrace` is **EXCLUDED** from `GameState` aggregate root.
- `debugTrace` and `metadata` are **EXCLUDED** from `stateHash` input calculation (`computeStateHash` consumes `GameStateSnapshotDTO` only).
- Logging or collecting `debugTrace` must not mutate PRNG state or alter simulation control flow.

### 2.5 Access Prohibition
The following layers are **EXPLICITLY FORBIDDEN** from accessing or invoking the simulation PRNG:
- Presentation / React UI Layer (`src/presentation/`)
- Visual Canvas Renderer (`PixiJSCanvasAdapter`)
- Persistence Layer (`IndexedDBStorageAdapter`, `MemoryStorageAdapter`)
- LLM Provider Adapters (`FetchCustomLLMAdapter`, `MockLLMAdapter`)

---

## 3. State Transition Contract

### 3.1 State Evolution
$$\text{GameState}(turn = N) \xrightarrow{\quad \text{ProcessTurn(actions, seed)} \quad} \text{GameState}(turn = N+1)$$

### 3.2 Immutability & Structural Boundaries
- Domain entities and aggregate roots are immutable. State transitions create new aggregate instances using structural sharing.
- Permitted State Mutations during turn tick:
  - `TurnNumber.value`: Incremented strictly by `+1`.
  - `Faction.resources`: Mutated via immutable `FixedPointResourcePool.add()` or `FixedPointResourcePool.subtract()` methods.
  - `Region.infrastructureLevel` / `Region.defenseLevel`: Incremented by `+1` up to maximum limit of `10`.
  - `Region.controllerFactionId`: Reassigned upon successful `REDEPLOY` influence resolution.
  - `GameState.actionLog`: Appended with executed `TurnAction` entities.

### 3.3 Aggregate Invariant Enforcement
- `regions.size === 2` (`"EL_ALAMEIN"`, `"RAS_EL_HEKMA"`).
- `factions.size === 2` (`"FACTION_ALPHA"`, `"FACTION_BETA"`).
- `Faction.resources.baseUnits >= 0n` (Resources can never drop below 0 base units).
- `1 <= infrastructureLevel <= 10` and `1 <= defenseLevel <= 10`.

### 3.4 Invalid Transition Rejection
- If a command fails validation (insufficient resources, non-owned target region for `DEVELOP`/`FORTIFY`, malformed IDs), the command is marked `REJECTED` in metadata.
- Validation failures throw a typed `DomainValidationError` during validation phase before PRNG consumption or aggregate mutation occurs, leaving domain state completely untouched.

---

## 4. Deterministic Snapshot & Canonical Serialization Contract

### 4.1 Deep Canonicalization (`canonicalizeDeep`)
To guarantee state hash identity across all browser JavaScript engines (V8, SpiderMonkey, JavaScriptCore), snapshot objects MUST pass through `canonicalizeDeep()` prior to JSON stringification:

$$\text{snapshot} \longrightarrow \text{canonicalizeDeep(snapshot)} \longrightarrow \text{JSON.stringify()} \longrightarrow \text{SHA-256}$$

#### Deep Canonicalization Rules:
1. **Recursive Key Sorting**: All object keys are sorted alphabetically at every nesting level.
2. **Fixed Map / Collection Ordering**:
   - `regions` map serialized in exact canonical key order: `["EL_ALAMEIN", "RAS_EL_HEKMA"]`.
   - `factions` map serialized in exact canonical key order: `["FACTION_ALPHA", "FACTION_BETA"]`.
3. **Preserved Array Order**: Array elements (e.g. `actionLog`) retain their explicit, deterministic execution sequence.
4. **BigInt Deterministic Encoding**: `FixedPointResourcePool.baseUnits` (`bigint`) is converted to explicit string representation (`"10000n"`).
5. **Float Elimination**: Zero floating-point numbers permitted in domain state DTOs. Scaled integer base units only.

### 4.2 State Hash Calculation Pipeline
```typescript
export function canonicalizeDeep(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    if (typeof obj === 'bigint') {
      return `${obj.toString()}n`;
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(canonicalizeDeep);
  }
  const sortedKeys = Object.keys(obj).sort();
  const result: Record<string, any> = {};
  for (const key of sortedKeys) {
    result[key] = canonicalizeDeep(obj[key]);
  }
  return result;
}

export function computeStateHash(snapshot: GameStateSnapshotDTO): string {
  const canonicalSnapshot = canonicalizeDeep(snapshot);
  const canonicalJson = JSON.stringify(canonicalSnapshot);
  return sha256(canonicalJson);
}
```

### 4.3 Replay Verification Requirement
- 500-turn continuous execution test (`TASK-017`) asserts:
$$\text{Hash}_{\text{Run 1}}(Turn_K) === \text{Hash}_{\text{Run 2}}(Turn_K) \quad \forall \, K \in [1, 500]$$

---

## 5. Layer Isolation & Security Rules

| Architectural Layer | Permitted Responsibilities | Forbidden Actions |
| :--- | :--- | :--- |
| **Pure Domain Core** (`src/domain/`) | Pure deterministic logic, entities, value objects, invariants, PRNG | Zero external imports, zero DOM, zero async calls, zero `Math.random()` |
| **Application Layer** (`src/application/`) | Use case orchestration (`ProcessTurnUseCase`), DTO mappers, port contracts | Direct infrastructure adapter instantiation, UI state management |
| **Infrastructure Layer** (`src/infrastructure/`) | Driven adapters (`IndexedDBStorageAdapter`, `PixiJSCanvasAdapter`, `FetchCustomLLMAdapter`) | Domain logic modification, direct domain entity mutation |
| **Presentation Layer** (`src/presentation/`) | React components, UI views, composition root (`main.ts`) | Direct domain invocation (must use `IGameApplicationService`) |
| **LLM Provider Port** (`ILLMProviderPort`) | Read-only qualitative narrative text generation with `TurnNumber` validation tag | Domain aggregate mutation, blocking turn tick execution |

---

## 6. Acceptance Verification Checklist

- [x] **TurnEngine Contract**: Formally defined with explicit inputs, outputs, execution order, and error handling.
- [x] **PRNG Ownership**: `PRNGService` established as sole authoritative owner using Mulberry32 algorithm.
- [x] **Single Derivation Formula**: `(TurnSeed.value + TurnNumber.value) >>> 0` unified across all sections.
- [x] **Random Consumption Rules**: Ordered strictly by Action ID -> Region ID -> Faction ID.
- [x] **Trace Isolation**: `debugTrace` isolated in metadata, excluded from `GameState` and `stateHash`.
- [x] **Deep Canonicalization**: `canonicalizeDeep` pipeline defined with key sorting, Map ordering, and BigInt string encoding.
- [x] **Layer Isolation**: Pure domain boundary enforced with zero external dependency leakage.

---
*End of Deterministic Turn Contract Specification (SS-002)*
