import { describe, it, expect } from 'vitest';
import { GSTTurnEngine, GSTAllocationMoveInput } from '../../domain/services/TurnEngine';
import { DatasetLoader } from '../../infrastructure/config/DatasetLoader';
import { GameStateMapper } from '../../application/mappers/GameStateMapper';
import { computeStateHash } from '../../application/services/CanonicalHashService';

describe('GST Command Log Replay Verification (Phase 2.5)', () => {
  it('reconstructs GSTTurnEngine state from scratch using Command Log and produces byte-for-byte identical stateHash', () => {
    const loader = new DatasetLoader();
    const balanceConfig = loader.loadBalanceConfig();
    const matrixData = loader.loadInfluenceMatrix();

    // 1. Build a 100-turn GST Move Command Log
    const commandLog: GSTAllocationMoveInput[] = [];
    for (let turn = 1; turn <= 100; turn++) {
      commandLog.push({
        sourceIndex: (turn - 1) % 5,
        targetIndex: turn % 5,
        amount: 5
      });
    }

    // 2. Run A: Initial Execution from Scratch
    const engineA = new GSTTurnEngine(balanceConfig, matrixData);
    for (const move of commandLog) {
      engineA.executeTurn(move);
    }
    const snapshotA = GameStateMapper.toGSTSnapshot(engineA);
    const hashA = computeStateHash(snapshotA);

    // 3. Run B: Replay Command Log on a Fresh Engine
    const engineB = new GSTTurnEngine(balanceConfig, matrixData);
    for (const move of commandLog) {
      engineB.executeTurn(move);
    }
    const snapshotB = GameStateMapper.toGSTSnapshot(engineB);
    const hashB = computeStateHash(snapshotB);

    // 4. Assert Equivalence and Determinism
    expect(hashA).toBe(hashB);
    expect(engineA.turnNumber).toBe(101);
    expect(engineB.turnNumber).toBe(101);
    expect(engineA.allocationVector).toEqual(engineB.allocationVector);
    expect(engineA.internalScores).toEqual(engineB.internalScores);
    expect(engineA.trustStates).toEqual(engineB.trustStates);
    expect(engineA.influenceMatrix.getEdgeWeight(0, 1)).toBe(0.5); // Turn 11 mutation preserved
    expect(engineB.influenceMatrix.getEdgeWeight(0, 1)).toBe(0.5);
  });
});
