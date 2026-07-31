import { describe, it, expect } from 'vitest';
import { TurnEngine } from '../../domain/services/TurnEngine';
import { createInitialGameState } from '../../domain/services/InitialGameStateFactory';
import { TurnAction } from '../../domain/entities/TurnAction';
import { FactionId } from '../../domain/values/FactionId';
import { RegionId } from '../../domain/values/RegionId';
import { TurnNumber } from '../../domain/values/TurnNumber';
import { GameStateMapper } from '../../application/mappers/GameStateMapper';
import { computeStateHash } from '../../application/services/CanonicalHashService';

describe('TurnEngine Deterministic Execution (TASK-007 / SS-002)', () => {
  it('executing TurnEngine twice on identical state, seed, and actions produces identical prngCallsCount and stateHash', () => {
    const initialStateA = createInitialGameState("game-001", 123456789);
    const initialStateB = createInitialGameState("game-001", 123456789);

    const action1 = new TurnAction("act-1", new FactionId("FACTION_ALPHA"), new RegionId("EL_ALAMEIN"), "DEVELOP", new TurnNumber(1));
    const action2 = new TurnAction("act-2", new FactionId("FACTION_BETA"), new RegionId("RAS_EL_HEKMA"), "FORTIFY", new TurnNumber(1));
    const actions = [action1, action2];

    const runA = TurnEngine.tick(initialStateA, actions);
    const runB = TurnEngine.tick(initialStateB, actions);

    const hashA = computeStateHash(GameStateMapper.toSnapshot(runA.newState));
    const hashB = computeStateHash(GameStateMapper.toSnapshot(runB.newState));

    expect(runA.prngCallsCount).toBe(runB.prngCallsCount);
    expect(hashA).toBe(hashB);
  });
});
