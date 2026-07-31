import { describe, it, expect } from 'vitest';
import { TurnEngine } from '../../domain/services/TurnEngine';
import { createInitialGameState } from '../../domain/services/InitialGameStateFactory';
import { TurnAction } from '../../domain/entities/TurnAction';
import { FactionId } from '../../domain/values/FactionId';
import { RegionId } from '../../domain/values/RegionId';
import { TurnNumber } from '../../domain/values/TurnNumber';
import { GameStateMapper } from '../../application/mappers/GameStateMapper';
import { computeStateHash } from '../../application/services/CanonicalHashService';

describe('TASK-014 — REDEPLOY Determinism Verification', () => {
  it('executes REDEPLOY command deterministically and updates controllerFactionId', () => {
    const seedValue = 123456789;

    const stateA = createInitialGameState("game-001", seedValue);
    const stateB = createInitialGameState("game-001", seedValue);

    const targetRegionBefore = stateA.regions.get("RAS_EL_HEKMA");
    expect(targetRegionBefore?.controllerFactionId.value).toBe("FACTION_BETA");

    // REDEPLOY command issued by FACTION_ALPHA targeting RAS_EL_HEKMA
    const redeployAction = new TurnAction(
      "act-redeploy-1",
      new FactionId("FACTION_ALPHA"),
      new RegionId("RAS_EL_HEKMA"),
      "REDEPLOY",
      new TurnNumber(1)
    );

    const runA = TurnEngine.tick(stateA, [redeployAction]);
    const runB = TurnEngine.tick(stateB, [redeployAction]);

    const targetRegionAfterA = runA.newState.regions.get("RAS_EL_HEKMA");
    expect(targetRegionAfterA?.controllerFactionId.value).toBe("FACTION_ALPHA");

    const hashA = computeStateHash(GameStateMapper.toSnapshot(runA.newState));
    const hashB = computeStateHash(GameStateMapper.toSnapshot(runB.newState));

    expect(hashA).toBe(hashB);
    expect(runA.prngCallsCount).toBe(runB.prngCallsCount);
  });
});
