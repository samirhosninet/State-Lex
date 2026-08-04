import { describe, it, expect } from 'vitest';
import { GSTTurnEngine } from '../../domain/services/TurnEngine';
import { DatasetLoader } from '../../infrastructure/config/DatasetLoader';
import { GameStateMapper } from '../../application/mappers/GameStateMapper';
import { computeStateHash } from '../../application/services/CanonicalHashService';
import { SnapshotEnvelopeDTO } from '../../application/dtos/Snapshots';
import { MemoryStorageAdapter } from '../../infrastructure/persistence/MemoryStorageAdapter';
import { IndexedDBStorageAdapter } from '../../infrastructure/persistence/IndexedDBStorageAdapter';

describe('GST Round-Trip Identity Verification (Phase 2.5)', () => {
  it('GSTTurnEngine -> Snapshot -> Storage -> Rehydrated GSTTurnEngine produces bit-for-bit identical state hash, turn, trust, allocation, and mutation state', async () => {
    const loader = new DatasetLoader();
    const balanceConfig = loader.loadBalanceConfig();
    const matrixData = loader.loadInfluenceMatrix();

    // 1. Create Engine & Execute 5 Turns
    const engine = new GSTTurnEngine(balanceConfig, matrixData);
    for (let turn = 1; turn <= 5; turn++) {
      engine.executeTurn({
        sourceIndex: (turn - 1) % 5,
        targetIndex: turn % 5,
        amount: 5
      });
    }

    expect(engine.turnNumber).toBe(6);

    // 2. Serialize to Snapshot DTO and Envelope
    const snapshotDTO = GameStateMapper.toGSTSnapshot(engine);
    const originalHash = computeStateHash(snapshotDTO);

    const envelope: SnapshotEnvelopeDTO = {
      schemaVersion: '1.0.0',
      state: snapshotDTO,
      stateHash: originalHash
    };

    // 3. Persist and Load via Memory Storage Adapter
    const memStorage = new MemoryStorageAdapter();
    await memStorage.saveSnapshot(envelope);
    const loadedMemEnvelope = await memStorage.loadActiveSnapshot();
    expect(loadedMemEnvelope).not.toBeNull();

    // 4. Persist and Load via IndexedDB Storage Adapter (falls back to memory in Vitest Node environment)
    const idbStorage = new IndexedDBStorageAdapter();
    await idbStorage.saveSnapshot(envelope);
    const loadedIdbEnvelope = await idbStorage.loadActiveSnapshot();
    expect(loadedIdbEnvelope).not.toBeNull();

    // 5. Rehydrate Fresh Engine from Loaded Envelope
    const rehydratedEngine = GameStateMapper.fromGSTSnapshot(loadedIdbEnvelope!.state, balanceConfig, matrixData);
    const rehydratedSnapshotDTO = GameStateMapper.toGSTSnapshot(rehydratedEngine);
    const rehydratedHash = computeStateHash(rehydratedSnapshotDTO);

    // 6. Assert Immediate Rehydration Bit-Identical Equality
    expect(rehydratedHash).toBe(originalHash);
    expect(rehydratedEngine.turnNumber).toBe(engine.turnNumber);
    expect(rehydratedEngine.allocationVector).toEqual(engine.allocationVector);
    expect(rehydratedEngine.internalScores).toEqual(engine.internalScores);
    expect(rehydratedEngine.trustStates).toEqual(engine.trustStates);

    // 7. Execute Turns 6..15 on both engines (crossing Turn 11 Rule Mutation boundary)
    for (let turn = 6; turn <= 15; turn++) {
      const move = {
        sourceIndex: (turn - 1) % 5,
        targetIndex: turn % 5,
        amount: 5
      };
      engine.executeTurn(move);
      rehydratedEngine.executeTurn(move);
    }

    const finalSnapshotOrig = GameStateMapper.toGSTSnapshot(engine);
    const finalSnapshotRehydrated = GameStateMapper.toGSTSnapshot(rehydratedEngine);
    const finalHashOrig = computeStateHash(finalSnapshotOrig);
    const finalHashRehydrated = computeStateHash(finalSnapshotRehydrated);

    // 8. Assert Post-Rehydration Execution Bit-Identical Equality across Mutation Boundary
    expect(finalHashRehydrated).toBe(finalHashOrig);
    expect(rehydratedEngine.turnNumber).toBe(16);
    expect(rehydratedEngine.allocationVector).toEqual(engine.allocationVector);
    expect(rehydratedEngine.internalScores).toEqual(engine.internalScores);
    expect(rehydratedEngine.trustStates).toEqual(engine.trustStates);
    expect(rehydratedEngine.influenceMatrix.getEdgeWeight(0, 1)).toBe(0.5);
    expect(engine.influenceMatrix.getEdgeWeight(0, 1)).toBe(0.5);
  });
});
