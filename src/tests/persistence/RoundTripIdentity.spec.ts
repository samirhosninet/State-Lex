import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../../domain/services/InitialGameStateFactory';
import { TurnEngine } from '../../domain/services/TurnEngine';
import { TurnAction } from '../../domain/entities/TurnAction';
import { FactionId } from '../../domain/values/FactionId';
import { RegionId } from '../../domain/values/RegionId';
import { TurnNumber } from '../../domain/values/TurnNumber';
import { GameStateMapper } from '../../application/mappers/GameStateMapper';
import { computeStateHash } from '../../application/services/CanonicalHashService';
import { SnapshotEnvelopeDTO } from '../../application/dtos/Snapshots';
import { IndexedDBStorageAdapter } from '../../infrastructure/persistence/IndexedDBStorageAdapter';

describe('Round-Trip Identity Verification (TASK-008 / SS-004)', () => {
  it('GameState -> SnapshotEnvelope -> Persistence -> Load -> Rehydrated GameState produces 100% byte-for-byte identical stateHash', async () => {
    // 1. Initial State & Turn Execution
    const initialState = createInitialGameState("game-001", 123456789);
    const action = new TurnAction("act-1", new FactionId("FACTION_ALPHA"), new RegionId("EL_ALAMEIN"), "DEVELOP", new TurnNumber(1));
    const turnResult = TurnEngine.tick(initialState, [action]);
    const originalState = turnResult.newState;

    // 2. Original State Hash
    const originalSnapshotDTO = GameStateMapper.toSnapshot(originalState);
    const originalHash = computeStateHash(originalSnapshotDTO);

    // 3. Create Envelope
    const envelope: SnapshotEnvelopeDTO = {
      schemaVersion: "1.0.0",
      state: originalSnapshotDTO,
      stateHash: originalHash
    };

    // 4. Persist to Storage Adapter
    const storage = new IndexedDBStorageAdapter();
    await storage.saveSnapshot(envelope);

    // 5. Load Snapshot from Storage
    const loadedEnvelope = await storage.loadActiveSnapshot();
    expect(loadedEnvelope).not.toBeNull();
    const persistedSnapshotHash = loadedEnvelope!.stateHash;

    // 6. Rehydrate GameState from Loaded Envelope
    const rehydratedState = GameStateMapper.fromSnapshot(loadedEnvelope!.state);
    const rehydratedSnapshotDTO = GameStateMapper.toSnapshot(rehydratedState);
    const rehydratedHash = computeStateHash(rehydratedSnapshotDTO);

    // 7. Verify Invariant: Original Hash === Persisted Hash === Rehydrated Hash
    expect(originalHash).toBe(persistedSnapshotHash);
    expect(persistedSnapshotHash).toBe(rehydratedHash);
    expect(originalHash).toBe(rehydratedHash);
  });
});
