# ADR-005: Atomic Persistence Writes & Storage Fallback

## Status
Ratified & Frozen (Mandatory)

## Context
Browser storage writes (IndexedDB / LocalStorage) can fail due to quota exhaustion, browser crashes during write, or private browsing restrictions.

## Decision
1. **Atomic Write Swap**: `IndexedDBStorageAdapter` writes new turn snapshots to a temporary key (`shadow_state_save.tmp`) before performing an atomic key pointer swap to `shadow_state_save.active`.
2. **Volatile Memory Fallback**: If IndexedDB fails or quota is exceeded, the storage adapter automatically transitions to `MemoryStorageAdapter` without throwing unhandled exceptions.

## Alternatives Considered
- **Direct Overwrite of Active Save Key**: Rejected due to high risk of save game corruption upon browser tab closure during write.
- **LocalStorage Fallback Only**: Rejected due to strict 5MB quota limits and synchronous I/O blocking.

## Implementation Constraints
- Save transaction must write to `.tmp` key before swapping pointer to `.active`.
- Storage quota errors must be caught and routed to `MemoryStorageAdapter`.

## Consequences
- **Positive**: Eliminates save game corruption; provides robust offline fallback.
- **Negative**: Volatile memory storage resets when the user closes the browser tab.

## Risk & Mitigations
- **Risk**: Browser quota exhaustion (`QuotaExceededError`).
- **Mitigation**: Adapter catches exception and seamlessly switches to `MemoryStorageAdapter` with UI warning banner.
