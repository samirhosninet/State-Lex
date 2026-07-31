# ADR-005: Atomic Persistence Writes & Storage Fallback

## Status
Ratified & Frozen (Mandatory)

## Context
Browser storage writes (IndexedDB / LocalStorage) can fail due to quota exhaustion, browser crashes during write, or private browsing restrictions.

## Decision
1. **Atomic Write Swap**: `IndexedDBStorageAdapter` writes new turn snapshots to a temporary key (`shadow_state_save.tmp`) before performing an atomic key pointer swap to `shadow_state_save.active`.
2. **Volatile Memory Fallback**: If IndexedDB fails or quota is exceeded, the storage adapter automatically transitions to `MemoryStorageAdapter` without throwing unhandled exceptions.

## Consequences
- **Positive**: Eliminates save game corruption; provides robust offline fallback.
- **Negative**: Volatile memory storage resets when the user closes the browser tab.
