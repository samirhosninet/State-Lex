import { describe, it, expect } from 'vitest';
import { TurnEngine } from '../../domain/services/TurnEngine';
import { createInitialGameState } from '../../domain/services/InitialGameStateFactory';
import { TurnAction } from '../../domain/entities/TurnAction';
import { FactionId } from '../../domain/values/FactionId';
import { RegionId } from '../../domain/values/RegionId';
import { TurnNumber } from '../../domain/values/TurnNumber';
import { GameStateMapper } from '../../application/mappers/GameStateMapper';
import { computeStateHash } from '../../application/services/CanonicalHashService';

describe('TASK-010 — 100-Turn Deterministic Replay Verification', () => {
  it('executes 100-turn simulation twice and asserts 100% per-turn stateHash and prngCallsCount equality', () => {
    const seedValue = 123456789;

    let currentStateA = createInitialGameState("game-001", seedValue);
    let currentStateB = createInitialGameState("game-001", seedValue);

    let cumulativeRNGCountA = 0;
    let cumulativeRNGCountB = 0;

    const hashesA: string[] = [];
    const hashesB: string[] = [];
    const rngCountsA: number[] = [];
    const rngCountsB: number[] = [];

    for (let turn = 1; turn <= 100; turn++) {
      const turnNum = new TurnNumber(turn);
      const actionAlpha = new TurnAction(`act-alpha-${turn}`, new FactionId("FACTION_ALPHA"), new RegionId("EL_ALAMEIN"), "DEVELOP", turnNum);
      const actionBeta = new TurnAction(`act-beta-${turn}`, new FactionId("FACTION_BETA"), new RegionId("RAS_EL_HEKMA"), "FORTIFY", turnNum);
      const actions = [actionAlpha, actionBeta];

      const resA = TurnEngine.tick(currentStateA, actions);
      const resB = TurnEngine.tick(currentStateB, actions);

      currentStateA = resA.newState;
      currentStateB = resB.newState;

      cumulativeRNGCountA += resA.prngCallsCount;
      cumulativeRNGCountB += resB.prngCallsCount;

      const hashA = computeStateHash(GameStateMapper.toSnapshot(currentStateA));
      const hashB = computeStateHash(GameStateMapper.toSnapshot(currentStateB));

      hashesA.push(hashA);
      hashesB.push(hashB);
      rngCountsA.push(cumulativeRNGCountA);
      rngCountsB.push(cumulativeRNGCountB);

      // Strict per-turn assertion
      expect(hashA, `Per-Turn StateHash discrepancy at Turn ${turn}`).toBe(hashB);
      expect(cumulativeRNGCountA, `Per-Turn PRNG Call Count discrepancy at Turn ${turn}`).toBe(cumulativeRNGCountB);
    }

    expect(hashesA).toEqual(hashesB);
    expect(rngCountsA).toEqual(rngCountsB);
  });
});
