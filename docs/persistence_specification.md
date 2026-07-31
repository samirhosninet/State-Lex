# Shadow State — Persistence System Specification

**Project**: Shadow State (Browser-Only Geopolitical Strategy Simulation MVP)  
**Document Status**: Ratified Persistence Design Specification (**ADR-005**)  

---

## 1. Storage Architecture & Strategy

Shadow State utilizes **IndexedDB** as its primary client-side persistence store under database name `ShadowStateDB` and object store `snapshots`.

### Key-Value Schema
- `shadow_state_save.active`: Holds the canonical active game snapshot.
- `shadow_state_save.tmp`: Temporary key used during atomic write operations.
- `shadow_state_save.bak`: Backup key maintained for recovery upon crash.

---

## 2. Atomic Write Protocol & Rollback

To prevent save game corruption from browser tab closure or power loss during write:

```
[1. Prepare Snapshot DTO] ──> [2. Write to shadow_state_save.tmp] ──> 
[3. Verify Transaction]  ──> [4. Atomic Pointer Swap to active] ──> [5. Clear tmp Key]
```

### Rollback & Fallback Protocol:
1. If steps 1–4 fail due to storage quota (`QuotaExceededError`) or Incognito mode restrictions:
2. The adapter catches the exception, logs a warning, and transitions to `MemoryStorageAdapter`.
3. The UI presents an offline warning banner without interrupting the current session.

---

## 3. BigInt Serialization Rules

Native `JSON.stringify()` throws a `TypeError` on `BigInt` properties.

### Custom DTO Mapper Strategy:
- **Serialization**: `FixedPointResourcePool.baseUnits` (BigInt) is converted to string representation (`"10000n"`) in `GameStateSnapshotDTO`.
- **Deserialization**: `BigInt(dtoValue.replace('n', ''))` reconstitutes the `BigInt` value object inside `src/domain/`.

---

## 4. Schema Versioning & Migration Strategy

- **Schema Version Header**: Every snapshot carries `schemaVersion: number` (v1.0.0 = `1`).
- **Migration Strategy**: If `snapshot.schemaVersion < CURRENT_SCHEMA_VERSION`, the adapter executes a sequential array of pure migration functions before passing DTO to domain deserializer.
