# Shadow State — Deterministic Snapshot Contract Specification (SS-003)

**Project**: Shadow State (Browser-Only Geopolitical Strategy Simulation MVP)  
**Document Status**: Ratified Architecture Contract Baseline (v1.1 SSoT — **ADR-005** & **SS-002**)  
**Scope**: Domain State Persistence & Serialization Boundary  

---

## 1. Snapshot DTO Contract

The snapshot DTO hierarchy defines the exact structural contract for state serialization. All snapshot types are plain, JSON-safe data transfer objects with strict `readonly` guarantees.

### 1.1 `GameStateSnapshotDTO` (Root Snapshot)
```typescript
export interface GameStateSnapshotDTO {
  readonly id: string;
  readonly turnNumber: number;
  readonly turnSeed: number;
  readonly factions: Record<string, FactionSnapshotDTO>;
  readonly regions: Record<string, RegionSnapshotDTO>;
  readonly actionLog: ReadonlyArray<TurnActionSnapshotDTO>;
}
```

### 1.2 Nested Snapshot DTOs

```typescript
export interface ResourceSnapshotDTO {
  readonly baseUnits: string; // BigInt encoded as string, e.g. "10000n"
}

export interface FactionSnapshotDTO {
  readonly id: "FACTION_ALPHA" | "FACTION_BETA";
  readonly name: string;
  readonly resources: ResourceSnapshotDTO;
  readonly controlledRegionIds: ReadonlyArray<"EL_ALAMEIN" | "RAS_EL_HEKMA">;
}

export interface RegionSnapshotDTO {
  readonly id: "EL_ALAMEIN" | "RAS_EL_HEKMA";
  readonly name: string;
  readonly controllerFactionId: "FACTION_ALPHA" | "FACTION_BETA";
  readonly infrastructureLevel: number; // Integer 1..10
  readonly defenseLevel: number;        // Integer 1..10
}

export interface TurnActionSnapshotDTO {
  readonly id: string;
  readonly factionId: "FACTION_ALPHA" | "FACTION_BETA";
  readonly targetRegionId: "EL_ALAMEIN" | "RAS_EL_HEKMA";
  readonly actionType: "DEVELOP" | "FORTIFY" | "REDEPLOY";
  readonly turnNumber: number;
}
```

### 1.3 Schema Constraints & Type Rules
- **Allowed Primitive Types**: `string`, `number` (finite integers only), `boolean`.
- **Readonly Guarantees**: All properties and array collections use `readonly` modifier.
- **Deterministic Field Names**: CamelCase identifier strings strictly matching interface declarations.
- **Nullability**: All fields are mandatory and non-optional. `undefined` is strictly forbidden.

---

## 2. Domain → Snapshot Mapping Contract

### 2.1 One-Way Mapping Pipeline
Domain runtime entities are isolated from persistence representations. Mapping operates strictly one-way:

$$\text{GameState (Aggregate)} \xrightarrow{\quad \text{GameStateMapper.toSnapshot()} \quad} \text{GameStateSnapshotDTO}$$

### 2.2 Boundary Rules
1. **Data Only**: Snapshot DTOs contain raw data fields only. Methods, functions, prototypes, and domain logic are prohibited.
2. **Entity Isolation**: Domain classes (`GameState`, `Faction`, `Region`, `TurnAction`) MUST NEVER be serialized directly.
3. **Map Normalization**: Runtime `Map<string, Faction>` and `Map<string, Region>` structures are normalized into plain `Record<string, T>` objects prior to snapshot creation.
4. **Canonical Entry Ordering**:
   - `regions` record keys are normalized in exact canonical sequence: `"EL_ALAMEIN"` then `"RAS_EL_HEKMA"`.
   - `factions` record keys are normalized in exact canonical sequence: `"FACTION_ALPHA"` then `"FACTION_BETA"`.

---

## 3. JSON-Safe Snapshot Invariant

### 3.1 Strict JSON Safety Rule
> **INVARIANT**: `GameStateSnapshotDTO` MUST contain JSON-safe data types exclusively. Runtime domain structures MUST be fully normalized before snapshot creation.

### 3.2 Type Safety Boundary Matrix

| Type Category | Allowed In Snapshot? | Format / Rule |
| :--- | :--- | :--- |
| `string` | **ALLOWED** | Valid UTF-8 strings |
| `number` | **ALLOWED** | Finite integers only (`Math.isFinite(n) && Number.isInteger(n)`) |
| `boolean` | **ALLOWED** | `true` \| `false` |
| `null` | **ALLOWED** | Null primitive |
| `bigint` | **MAPPED** | Encoded as string with `'n'` suffix (e.g. `"10000n"`) |
| `Array` | **ALLOWED** | Plain `ReadonlyArray<T>` |
| `Record` | **ALLOWED** | Plain objects (`Record<string, T>`) |
| `Date` | **FORBIDDEN** | Use numeric timestamps or turn integers |
| `Map` / `Set` | **FORBIDDEN** | Normalize to `Record<string, T>` or `Array<T>` |
| Class / Function | **FORBIDDEN** | Strip methods; map fields to DTO |
| `undefined` | **FORBIDDEN** | Omit or represent explicitly |
| Circular Ref | **FORBIDDEN** | Tree-structured acyclic DTOs only |

---

## 4. Schema Versioning Contract

### 4.1 `SnapshotEnvelope` Specification
All persisted game saves wrap the snapshot state inside an immutable `SnapshotEnvelope`:

```typescript
export interface SnapshotEnvelope {
  readonly schemaVersion: string; // e.g. "1.0.0"
  readonly state: GameStateSnapshotDTO;
  readonly stateHash: string;      // SHA-256 computed via SS-002 computeStateHash(state)
}
```

### 4.2 Versioning & Migration Rules
1. **Mandatory Header**: Every persisted payload MUST include `schemaVersion: "1.0.0"`.
2. **Explicit Validation Failure**: If `envelope.schemaVersion` is incompatible with the current runtime version, the persistence layer MUST reject the save with a typed `SnapshotVersionMismatchError`. Silent fallback or automatic unverified migration is prohibited.
3. **Breaking Change Policy**: Structural modifications to snapshot fields require incrementing `schemaVersion`.

---

## 5. Snapshot Validation Contract

Before domain rehydration or persistence write, `SnapshotValidator.validate(envelope)` enforces:

1. **Structural Completeness**: Asserts all required fields exist and match expected DTO types.
2. **Type Purity**: Asserts zero forbidden runtime types (`Date`, native `Map`/`Set`, functions, `undefined`) exist within the payload.
3. **Domain Invariants**:
   - `state.turnNumber >= 1`
   - `Object.keys(state.regions).length === 2` (`"EL_ALAMEIN"`, `"RAS_EL_HEKMA"`)
   - `Object.keys(state.factions).length === 2` (`"FACTION_ALPHA"`, `"FACTION_BETA"`)
   - `resources.baseUnits` matches regex `/^\d+n$/` (non-negative BigInt string)
4. **Hash Integrity**: Re-evaluates `computeStateHash(envelope.state)` (using SS-002 `canonicalizeDeep` pipeline) and asserts:
$$\text{computeStateHash(envelope.state)} === \text{envelope.stateHash}$$

---

## 6. Persistence Integration Boundary

```
┌───────────────────────────────────────────────────────────────────────────┐
│ INFRASTRUCTURE STORAGE (IndexedDBStorageAdapter)                           │
│  - Stores SnapshotEnvelope JSON payloads only                             │
│  - Zero domain aggregate instances stored                                  │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │ Load Raw Payload
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ SNAPSHOT VALIDATION LAYER (SnapshotValidator)                             │
│  - Validates schemaVersion, structural DTO purity, and stateHash          │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │ Validated GameStateSnapshotDTO
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ DOMAIN REHYDRATION LAYER (GameStateMapper.fromSnapshot())                 │
│  - Reconstitutes BigInt, native Maps, and domain Aggregate Roots          │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Acceptance Verification Checklist

- [x] **DTO Schema Complete**: `GameStateSnapshotDTO`, `FactionSnapshotDTO`, `RegionSnapshotDTO`, `TurnActionSnapshotDTO`, `ResourceSnapshotDTO` fully specified.
- [x] **Domain/Snapshot Boundary Explicit**: One-way `GameStateMapper` specified; domain entities isolated from persistence DTOs.
- [x] **JSON-Safe Invariant Enforced**: Explicit matrix banning `Date`, native `Map`, `Set`, functions, `undefined`, and circular references.
- [x] **Schema Versioning Defined**: `SnapshotEnvelope` with mandatory `schemaVersion: "1.0.0"` and explicit validation rejection defined.
- [x] **No Duplicate Hashing Logic**: Reuses SS-002 `computeStateHash` and `canonicalizeDeep` without duplicate definitions.
- [x] **SS-002 Compatibility**: 100% compatible with SS-002 determinism contract baseline.

---
*End of Deterministic Snapshot Contract Specification (SS-003)*
