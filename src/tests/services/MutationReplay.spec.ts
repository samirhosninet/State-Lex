import { describe, it, expect } from 'vitest';
import { TurnEngine } from '../../domain/services/TurnEngine';
import { createInitialGameState } from '../../domain/services/InitialGameStateFactory';
import { TurnAction } from '../../domain/entities/TurnAction';
import { FactionId } from '../../domain/values/FactionId';
import { RegionId } from '../../domain/values/RegionId';
import { TurnNumber } from '../../domain/values/TurnNumber';
import { GameStateMapper } from '../../application/mappers/GameStateMapper';
import { computeStateHash } from '../../application/services/CanonicalHashService';

describe('TASK-012 — Corruption / Mutation Replay Verification', () => {
  it('modifying a single command at Turn 50 preserves hash equality for turns 1..49 and causes state hash divergence at Turn 50+', () => {
    const seedValue = 123456789;

    // 1. Build Original Command Log (100 turns)
    const originalLog: TurnAction[][] = [];
    const mutatedLog: TurnAction[][] = [];

    for (let turn = 1; turn <= 100; turn++) {
      const turnNum = new TurnNumber(turn);
      const actionAlphaOrig = new TurnAction(`act-alpha-${turn}`, new FactionId("FACTION_ALPHA"), new RegionId("EL_ALAMEIN"), "DEVELOP", turnNum);
      const actionBeta = new TurnAction(`act-beta-${turn}`, new FactionId("FACTION_BETA"), new RegionId("RAS_EL_HEKMA"), "FORTIFY", turnNum);

      originalLog.push([actionAlphaOrig, actionBeta]);

      if (turn === 50) {
        // Single command mutation at Turn 50
        const actionAlphaMutated = new TurnAction(`act-alpha-${turn}`, new FactionId("FACTION_ALPHA"), new RegionId("EL_ALAMEIN"), "FORTIFY", turnNum);
        mutatedLog.push([actionAlphaMutated, actionBeta]);
      } else {
        mutatedLog.push([actionAlphaOrig, actionBeta]);
      }
    }

    // 2. Execute Run A (Original)
    let stateA = createInitialGameState("game-001", seedValue);
    const hashesA: string[] = [];
    for (const turnActions of originalLog) {
      const res = TurnEngine.tick(stateA, turnActions);
      stateA = res.newState;
      hashesA.push(computeStateHash(GameStateMapper.toSnapshot(stateA)));
    }

    // 3. Execute Run B (Mutated)
    let stateB = createInitialGameState("game-001", seedValue);
    const hashesB: string[] = [];
    for (const turnActions of mutatedLog) {
      const res = TurnEngine.tick(stateB, turnActions);
      stateB = res.newState;
      hashesB.push(computeStateHash(GameStateMapper.toSnapshot(stateB)));
    }

    // 4. Assert Pre-Mutation Equality (Turns 1..49)
    for (let turnIdx = 0; turnIdx < 49; turnIdx++) {
      expect(hashesA[turnIdx], `Divergence found prior to mutation at Turn ${turnIdx + 1}`).toBe(hashesB[turnIdx]);
    }

    // 5. Assert Mutation Divergence (Turn 50)
    expect(hashesA[49]).not.toBe(hashesB[49]);

    // 6. Assert Post-Mutation State Propagation (Turns 51..100)
    for (let turnIdx = 50; turnIdx < 100; turnIdx++) {
      expect(hashesA[turnIdx], `State convergence detected at Turn ${turnIdx + 1}`).not.toBe(hashesB[turnIdx]);
    }
  });
});
