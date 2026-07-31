# Shadow State — Persistence & Rehydration Contract Specification (SS-004)

**Project**: Shadow State (Browser-Only Geopolitical Strategy Simulation MVP)  
**Document Status**: Ratified Architecture Contract Baseline (v1.1 SSoT — **SS-002** & **SS-003**)  
**Scope**: Client-Side Persistence Layer, Transaction Integrity & Domain Rehydration  

---

## 1. Round-Trip Identity Invariant

The primary persistence contract guarantees bit-for-bit mathematical state integrity across storage boundaries:

> **PRIMARY INVARIANT**: For every valid domain state `GameState`, the transformation:
$$\text{GameState} \xrightarrow{\quad \text{GameStateMapper.toSnapshot()} \quad} \text{SnapshotEnvelope} \xrightarrow{\quad \text{IndexedDB Storage} \quad} \text{GameStateMapper.fromSnapshot()} \xrightarrow{\quad \text{Rehydrated GameState} \quad}$$
MUST produce an identical `stateHash` when evaluated using the **SS-002** canonical hashing pipeline (`computeStateHash`).

- Canonical hashing rules, key sorting, `Map` ordering, and SHA-256 calculation are governed strictly by **SS-002**.
- Any `stateHash` discrepancy before save or after rehydration constitutes an immediate, unrecoverable contract violation.

---

## 2. IndexedDB Transaction Contract

Persistence operations rely strictly on standard HTML5 IndexedDB transaction atomicity.

### 2.1 Database & Store Parameters
- **Database Name**: `ShadowStateDB`
- **Object Store**: `snapshots`
- **Primary Key**: `active_save` (Single active save slot for MVP)

### 2.2 Atomic Commit Protocol
- **Single Transaction**: Save operations execute within a single `readwrite` transaction (`db.transaction(["snapshots"], "readwrite", { durability: "relaxed" })`).
- **Standard Atomicity**: Writes rely exclusively on IndexedDB transaction commit semantics (`transaction.oncomplete` / `transaction.onerror`).
- **No Custom Protocols**: Custom `.tmp` file protocol, pointer swapping, dual-save keys, write-ahead logs, or journal files are **EXPLICITLY PROHIBITED**.

### 2.3 MVP Durability Decision (`durability: "relaxed"`)
- **Setting**: IndexedDB transactions use `durability: "relaxed"` for low-latency write performance.
- **Accepted Risk**: A sudden OS crash or hardware power loss immediately following transaction commit may result in loss of the single most recent turn save. This risk is explicitly accepted for the Browser-Only MVP scope.

---

## 3. Save Pipeline

The save operation follows a strict, non-blocking deterministic sequence:

$$\text{Validate Snapshot DTO} \longrightarrow \text{computeStateHash()} \longrightarrow \text{Construct SnapshotEnvelope} \longrightarrow \text{Open Transaction} \longrightarrow \text{Write Envelope} \longrightarrow \text{Commit} \longrightarrow \text{Success}$$

### Step-by-Step Execution Sequence:
1. **Validate Snapshot DTO**: Verify runtime `GameStateSnapshotDTO` against **SS-003** JSON-safe snapshot invariants.
2. **Compute State Hash**: Execute `stateHash = computeStateHash(snapshotDTO)` using **SS-002** `canonicalizeDeep` pipeline.
3. **Construct Envelope**: Wrap payload into immutable `SnapshotEnvelope` with `schemaVersion: "1.0.0"` (**SS-003**).
4. **Open Transaction**: Request single `readwrite` transaction on `snapshots` store with `durability: "relaxed"`.
5. **Write Payload**: Issue `store.put(envelope, "active_save")`.
6. **Transaction Commit**: Await `transaction.oncomplete`.
7. **Success Return**: Return boolean `true` to caller.

*Execution Rules*: Zero hidden retries. Any step failure immediately aborts transaction and propagates error.

---

## 4. Load Pipeline

The load operation follows a strict, deterministic validation and rehydration sequence:

$$\text{Read Active Key} \longrightarrow \text{Schema Validation} \longrightarrow \text{Hash Integrity Validation} \longrightarrow \text{fromSnapshot() Mapper} \longrightarrow \text{Rehydrated GameState}$$

### Step-by-Step Execution Sequence:
1. **Read Active Key**: Retrieve raw `SnapshotEnvelope` from IndexedDB key `"active_save"` via `readonly` transaction.
2. **Schema Validation**: Verify `envelope.schemaVersion === "1.0.0"`. Discrepancies raise `SnapshotVersionMismatchError`.
3. **Hash Integrity Validation**: Re-evaluate `recomputedHash = computeStateHash(envelope.state)`. If `recomputedHash !== envelope.stateHash`, raise `SnapshotCorruptedError`.
4. **Domain Rehydration**: Pass validated `GameStateSnapshotDTO` to `GameStateMapper.fromSnapshot()`.
5. **Return Rehydrated State**: Return validated, immutable `GameState` aggregate root to caller.

*Execution Rules*: Any validation failure aborts load immediately without partial state instantiation.

---

## 5. Persistence Failure Matrix

| Failure Mode | Detection Mechanism | Returned Error Type | Recovery & System Behavior |
| :--- | :--- | :--- | :--- |
| **Hash Mismatch** | `computeStateHash(envelope.state) !== envelope.stateHash` | `SnapshotCorruptedError` | Load aborts immediately; active session remains unchanged; error logged to console. |
| **Schema Mismatch** | `envelope.schemaVersion !== "1.0.0"` | `SnapshotVersionMismatchError` | Load aborts immediately; rejects incompatible save version; requires user reset. |
| **IndexedDB Unavailable** | `window.indexedDB` null or `open()` throws | `StorageUnavailableError` | Adapter transitions to `MemoryStorageAdapter` fallback; displays non-blocking UI warning banner. |
| **Transaction Abort** | `QuotaExceededError` or `transaction.onerror` | `StorageTransactionError` | Active transaction rolls back automatically; transitions to volatile `MemoryStorageAdapter`. |
| **Corrupted JSON** | Parse error on storage deserialization | `SnapshotParseError` | Load aborts immediately; rejects unparseable payload. |
| **Unexpected Storage Error** | Unhandled DOMException during I/O | `PersistenceInternalError` | Operation fails gracefully; active in-memory game state preserved. |

---

## 6. Rehydration Contract (`GameStateMapper.fromSnapshot()`)

The domain mapper reconstitutes pure domain aggregates from JSON-safe snapshot DTOs.

### Rehydration Requirements:
1. **Restore BigInt Values**: Convert `ResourceSnapshotDTO.baseUnits` string (`"10000n"`) back to native `BigInt` via `BigInt(dto.baseUnits.replace('n', ''))`. Reconstitute `FixedPointResourcePool` value objects.
2. **Restore Native Maps**: Reconstitute `factions` map as native `Map<string, Faction>` and `regions` map as native `Map<string, Region>`.
3. **Restore Value Objects & Entities**: Re-instantiate immutable `TurnNumber`, `TurnSeed`, `RegionId`, `FactionId`, `Region` entities, and `TurnAction` entities.
4. **Enforce Invariants**: Invoke domain aggregate constructors (`GameState`, `Faction`, `Region`) to assert all business invariants (`regions.size === 2`, `factions.size === 2`, `resources >= 0n`).

*Atomicity*: Partial rehydration is strictly prohibited. If any entity instantiation or invariant check fails, the mapper throws `DomainRehydrationError` and aborts.

---

## 7. Acceptance Test Specifications

### Test 1: Round-Trip Identity (Highest Priority)
- **Given**: A valid, active `GameState` aggregate root at turn $N$.
- **When**: The state is mapped to `SnapshotEnvelope`, written to IndexedDB, loaded from IndexedDB, and passed through `GameStateMapper.fromSnapshot()`.
- **Then**: The rehydrated `GameState` snapshot produces a `stateHash` that is 100% byte-for-byte identical to the original state hash computed via **SS-002** `computeStateHash()`.

### Test 2: Transaction Rollback
- **Given**: An active IndexedDB storage adapter instance.
- **When**: A save operation triggers a simulated `QuotaExceededError` during `store.put()`.
- **Then**: The transaction aborts automatically, no partial data is written to `"active_save"`, and the adapter seamlessly switches to `MemoryStorageAdapter`.

### Test 3: Hash Mismatch Detection
- **Given**: A persisted `SnapshotEnvelope` where `envelope.state.turnNumber` has been modified externally in IndexedDB.
- **When**: `loadActiveSnapshot()` is executed.
- **Then**: Hash validation detects `computeStateHash(envelope.state) !== envelope.stateHash`, throws `SnapshotCorruptedError`, and halts load execution.

### Test 4: Schema Version Mismatch Detection
- **Given**: A persisted `SnapshotEnvelope` with `schemaVersion: "0.9.0"`.
- **When**: `loadActiveSnapshot()` is executed.
- **Then**: Schema validation detects version incompatibility, throws `SnapshotVersionMismatchError`, and halts load execution.

### Test 5: Corrupted Snapshot Handling
- **Given**: An IndexedDB record under `"active_save"` containing invalid/malformed JSON string data.
- **When**: `loadActiveSnapshot()` is executed.
- **Then**: Deserialization throws `SnapshotParseError` and load aborts cleanly without crashing the application.

### Test 6: IndexedDB Unavailable Fallback
- **Given**: A browser environment with IndexedDB disabled (Incognito mode restrictions or blocked permissions).
- **When**: `IndexedDBStorageAdapter.initialize()` executes.
- **Then**: The adapter catches `StorageUnavailableError` and transparently routes all persistence calls to `MemoryStorageAdapter`.

---
*End of Persistence & Rehydration Contract Specification (SS-004)*
