import { describe, it, expect } from 'vitest';
import { GSTTurnEngine, GSTAllocationMoveInput } from '../../domain/services/TurnEngine';
import { DatasetLoader } from '../../infrastructure/config/DatasetLoader';
import { GameStateMapper } from '../../application/mappers/GameStateMapper';
import { computeStateHash } from '../../application/services/CanonicalHashService';

describe('GST Command Tampering / Integrity Verification (Phase 2.5)', () => {
  it('modifying a single move command at Turn 50 preserves hash equality for turns 1..49 and causes state hash divergence at Turn 50+', () => {
    const loader = new DatasetLoader();
    const balanceConfig = loader.loadBalanceConfig();
    const matrixData = loader.loadInfluenceMatrix();

    // 1. Build Original and Mutated Command Logs (100 turns)
    const originalLog: GSTAllocationMoveInput[] = [];
    const tamperedLog: GSTAllocationMoveInput[] = [];

    for (let turn = 1; turn <= 100; turn++) {
      const origMove: GSTAllocationMoveInput = {
        sourceIndex: (turn - 1) % 5,
        targetIndex: turn % 5,
        amount: 5
      };

      originalLog.push(origMove);

      if (turn === 50) {
        // Tamper exactly one command at Turn 50
        const tamperedMove: GSTAllocationMoveInput = {
          sourceIndex: (turn - 1) % 5,
          targetIndex: turn % 5,
          amount: 10 // Tampered amount
        };
        tamperedLog.push(tamperedMove);
      } else {
        tamperedLog.push(origMove);
      }
    }

    // 2. Execute Original Log (Run A)
    const engineA = new GSTTurnEngine(balanceConfig, matrixData);
    const hashesA: string[] = [];
    for (const move of originalLog) {
      engineA.executeTurn(move);
      hashesA.push(computeStateHash(GameStateMapper.toGSTSnapshot(engineA)));
    }

    // 3. Execute Tampered Log (Run B)
    const engineB = new GSTTurnEngine(balanceConfig, matrixData);
    const hashesB: string[] = [];
    for (const move of tamperedLog) {
      engineB.executeTurn(move);
      hashesB.push(computeStateHash(GameStateMapper.toGSTSnapshot(engineB)));
    }

    // 4. Execute Tampered Log Again (Run C - Replay Determinism Check)
    const engineC = new GSTTurnEngine(balanceConfig, matrixData);
    const hashesC: string[] = [];
    for (const move of tamperedLog) {
      engineC.executeTurn(move);
      hashesC.push(computeStateHash(GameStateMapper.toGSTSnapshot(engineC)));
    }

    // 5. Assert Pre-Tampering Hash Equality (Turns 1..49)
    for (let turnIdx = 0; turnIdx < 49; turnIdx++) {
      expect(hashesA[turnIdx], `Hash mismatch before tampering at Turn ${turnIdx + 1}`).toBe(hashesB[turnIdx]);
    }

    // 6. Assert Tampering Divergence at Turn 50
    expect(hashesA[49]).not.toBe(hashesB[49]);

    // 7. Assert Post-Tampering State Propagation (Turns 51..100)
    for (let turnIdx = 50; turnIdx < 100; turnIdx++) {
      expect(hashesA[turnIdx], `State convergence detected at Turn ${turnIdx + 1}`).not.toBe(hashesB[turnIdx]);
    }

    // 8. Assert Tampered Log Replay Is Deterministic (Run B === Run C)
    for (let turnIdx = 0; turnIdx < 100; turnIdx++) {
      expect(hashesB[turnIdx]).toBe(hashesC[turnIdx]);
    }
  });
});
