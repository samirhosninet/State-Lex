import { GameState } from '../aggregates/GameState';
import { TurnAction } from '../entities/TurnAction';
import { TurnSeed } from '../values/TurnSeed';
import { PRNGService } from './PRNGService';
import { FixedPointResourcePool } from '../values/FixedPointResourcePool';
import { Region } from '../entities/Region';
import { Faction } from '../aggregates/Faction';

export interface TurnExecutionResult {
  readonly newState: GameState;
  readonly prngCallsCount: number;
}

export class TurnEngine {
  public static tick(
    currentState: GameState,
    actions: ReadonlyArray<TurnAction>
  ): TurnExecutionResult {
    // 1. Canonical Seed Derivation: (TurnSeed.value + TurnNumber.value) >>> 0 (SS-002)
    const derivedSeedValue = (currentState.turnSeed.value + currentState.turnNumber.value) >>> 0;
    const turnPRNGSeed = new TurnSeed(derivedSeedValue);
    const prng = new PRNGService(turnPRNGSeed);
    let prngCallsCount = 0;

    const updatedRegions = new Map<string, Region>(currentState.regions);
    const updatedFactions = new Map<string, Faction>(currentState.factions);

    // 2. Action Resolution Sequence
    for (const action of actions) {
      const faction = updatedFactions.get(action.factionId.value);
      const region = updatedRegions.get(action.targetRegionId.value);

      if (!faction || !region) continue;

      if (action.actionType === "DEVELOP") {
        const cost = FixedPointResourcePool.fromUnits(50); // 5000n base units
        if (faction.resources.baseUnits >= cost.baseUnits) {
          const newResources = faction.resources.subtract(cost);
          const newInfra = Math.min(10, region.infrastructureLevel + 1);
          updatedFactions.set(faction.id.value, faction.withResources(newResources));
          updatedRegions.set(region.id.value, region.withInfrastructureLevel(newInfra));
        }
      } else if (action.actionType === "FORTIFY") {
        const cost = FixedPointResourcePool.fromUnits(50);
        if (faction.resources.baseUnits >= cost.baseUnits) {
          const newResources = faction.resources.subtract(cost);
          const newDefense = Math.min(10, region.defenseLevel + 1);
          updatedFactions.set(faction.id.value, faction.withResources(newResources));
          updatedRegions.set(region.id.value, region.withDefenseLevel(newDefense));
        }
      } else if (action.actionType === "REDEPLOY") {
        if (region.defenseLevel <= 3) {
          const previousControllerId = region.controllerFactionId;
          const newControllerId = faction.id;
          if (!previousControllerId.equals(newControllerId)) {
            const updatedRegion = region.withController(newControllerId);
            updatedRegions.set(region.id.value, updatedRegion);

            const prevFaction = updatedFactions.get(previousControllerId.value);
            if (prevFaction) {
              const newPrevRegions = prevFaction.controlledRegionIds.filter(r => !r.equals(region.id));
              updatedFactions.set(previousControllerId.value, prevFaction.withControlledRegions(newPrevRegions));
            }

            const newFaction = updatedFactions.get(newControllerId.value);
            if (newFaction) {
              const newNextRegions = [...newFaction.controlledRegionIds.filter(r => !r.equals(region.id)), region.id];
              updatedFactions.set(newControllerId.value, newFaction.withControlledRegions(newNextRegions));
            }
          }
        }
      }
    }

    // 3. Region Event Sequence (Fixed Canonical Order: EL_ALAMEIN then RAS_EL_HEKMA)
    const canonicalRegionKeys = ["EL_ALAMEIN", "RAS_EL_HEKMA"];
    for (const key of canonicalRegionKeys) {
      const region = updatedRegions.get(key);
      if (!region) continue;

      // Consume 1 PRNG value per region
      const eventPRNGValue = prng.next();
      prngCallsCount++;

      const controller = updatedFactions.get(region.controllerFactionId.value);
      if (controller) {
        const baseYield = FixedPointResourcePool.fromUnits(10); // 1000n base units
        const yieldMultiplier = 1.0 + region.infrastructureLevel * 0.1 + eventPRNGValue * 0.2;
        const totalYield = baseYield.multiplyFactor(yieldMultiplier);
        updatedFactions.set(controller.id.value, controller.withResources(controller.resources.add(totalYield)));
      }
    }

    // 4. Faction Stability Sequence (Fixed Canonical Order: FACTION_ALPHA then FACTION_BETA)
    const canonicalFactionKeys = ["FACTION_ALPHA", "FACTION_BETA"];
    for (const key of canonicalFactionKeys) {
      const faction = updatedFactions.get(key);
      if (!faction) continue;

      // Consume 1 PRNG value per faction
      prng.next();
      prngCallsCount++;
    }

    // 5. Advance Turn Number
    const nextTurnNumber = currentState.turnNumber.next();
    const updatedActionLog = [...currentState.actionLog, ...actions];

    const newState = currentState.withTurn(
      nextTurnNumber,
      updatedFactions,
      updatedRegions,
      updatedActionLog
    );

    return {
      newState,
      prngCallsCount
    };
  }
}
