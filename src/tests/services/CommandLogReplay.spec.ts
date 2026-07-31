import { describe, it, expect } from 'vitest';
import { TurnEngine } from '../../domain/services/TurnEngine';
import { createInitialGameState } from '../../domain/services/InitialGameStateFactory';
import { TurnAction } from '../../domain/entities/TurnAction';
import { FactionId } from '../../domain/values/FactionId';
import { RegionId } from '../../domain/values/RegionId';
import { TurnNumber } from '../../domain/values/TurnNumber';
import { GameStateMapper } from '../../application/mappers/GameStateMapper';
import { computeStateHash } from '../../application/services/CanonicalHashService';

describe('TASK-011 — Command Log Replay Verification', () => {
  it('reconstructs complete GameState from scratch using Command Log and produces byte-for-byte identical stateHash matching TASK-010 baseline', () => {
    const seedValue = 123456789;
    const task10ReferenceHash = "419bd88df674271da37ec84588c61b0a3a6aa2270027dcf50db595940ee61daf";

    // Build the 100-turn Command Log
    const commandLog: TurnAction[][] = [];
    for (let turn = 1; turn <= 100; turn++) {
      const turnNum = new TurnNumber(turn);
      const actionAlpha = new TurnAction(`act-alpha-${turn}`, new FactionId("FACTION_ALPHA"), new RegionId("EL_ALAMEIN"), "DEVELOP", turnNum);
      const actionBeta = new TurnAction(`act-beta-${turn}`, new FactionId("FACTION_BETA"), new RegionId("RAS_EL_HEKMA"), "FORTIFY", turnNum);
      commandLog.push([actionAlpha, actionBeta]);
    }

    // Run 1: From Scratch Rebuild A
    let stateA = createInitialGameState("game-001", seedValue);
    let totalPRNGCallsA = 0;
    for (const turnActions of commandLog) {
      const res = TurnEngine.tick(stateA, turnActions);
      stateA = res.newState;
      totalPRNGCallsA += res.prngCallsCount;
    }
    const finalHashA = computeStateHash(GameStateMapper.toSnapshot(stateA));

    // Run 2: From Scratch Rebuild B
    let stateB = createInitialGameState("game-001", seedValue);
    let totalPRNGCallsB = 0;
    for (const turnActions of commandLog) {
      const res = TurnEngine.tick(stateB, turnActions);
      stateB = res.newState;
      totalPRNGCallsB += res.prngCallsCount;
    }
    const finalHashB = computeStateHash(GameStateMapper.toSnapshot(stateB));

    // Verifications
    expect(finalHashA).toBe(finalHashB);
    expect(totalPRNGCallsA).toBe(totalPRNGCallsB);
    expect(totalPRNGCallsA).toBe(400);
    expect(finalHashA).toBe(task10ReferenceHash);
    expect(finalHashB).toBe(task10ReferenceHash);
  });
});
