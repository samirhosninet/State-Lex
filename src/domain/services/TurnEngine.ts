import { GameState } from '../aggregates/GameState';
import { TurnAction } from '../entities/TurnAction';
import { TurnSeed } from '../values/TurnSeed';
import { PRNGService } from './PRNGService';
import { FixedPointResourcePool } from '../values/FixedPointResourcePool';
import { Region } from '../entities/Region';
import { Faction } from '../aggregates/Faction';

import { InfluenceMatrix } from './InfluenceMatrix';
import { TrustComponent, TrustState } from './TrustComponent';
import { RuleMutationScheduler, WorldChangeRecord } from './RuleMutationScheduler';
import { NeglectTracker, ConsequenceRecord } from './NeglectTracker';
import { BalanceConfigData, MatrixSchemaData } from './MatrixSchemaValidator';

export interface TurnExecutionResult {
  readonly newState: GameState;
  readonly prngCallsCount: number;
}

export interface GSTAllocationMoveInput {
  sourceIndex: number;
  targetIndex: number;
  amount: number;
}

export interface GSTTurnExecutionResult {
  turnNumber: number;
  allocationBefore: number[];
  allocationAfter: number[];
  trustStatesBefore: TrustState[];
  trustStatesAfter: TrustState[];
  internalScoresAfter: number[];
  worldChanges: WorldChangeRecord[];
  consequences: ConsequenceRecord[];
}

export class GSTTurnEngine {
  private _turnNumber: number = 1;
  private readonly _allocationVector: number[] = [20, 20, 20, 20, 20];
  private readonly _influenceMatrix: InfluenceMatrix;
  private readonly _trustComponents: TrustComponent[];
  private readonly _mutationScheduler: RuleMutationScheduler;
  private readonly _neglectTracker: NeglectTracker;

  constructor(balanceConfig: BalanceConfigData, matrixData: MatrixSchemaData) {
    this._influenceMatrix = new InfluenceMatrix(matrixData);
    this._mutationScheduler = new RuleMutationScheduler();
    this._neglectTracker = new NeglectTracker();

    const initialTrust = balanceConfig.initialTrust;
    const thresholds = balanceConfig.hysteresisThresholds;
    const vectorOrder = matrixData.vectorOrder;

    this._trustComponents = vectorOrder.map(actorName => {
      const score = initialTrust[actorName] ?? 50;
      return new TrustComponent(score, thresholds);
    });
  }

  public get turnNumber(): number {
    return this._turnNumber;
  }

  public get allocationVector(): number[] {
    return [...this._allocationVector];
  }

  public get trustStates(): TrustState[] {
    return this._trustComponents.map(tc => tc.visibleState);
  }

  public get internalScores(): number[] {
    return this._trustComponents.map(tc => tc.internalScore);
  }

  public rehydrateState(turnNumber: number, allocation: number[], internalScores?: number[]): void {
    this._turnNumber = turnNumber;
    for (let i = 0; i < 5; i++) {
      if (allocation && typeof allocation[i] === 'number') {
        this._allocationVector[i] = allocation[i];
      }
      if (internalScores && typeof internalScores[i] === 'number') {
        this._trustComponents[i].setScore(internalScores[i]);
      }
    }
  }

  public executeTurn(moveInput: GSTAllocationMoveInput): GSTTurnExecutionResult {
    const src = moveInput ? moveInput.sourceIndex : undefined;
    const tgt = moveInput ? moveInput.targetIndex : undefined;
    const amt = moveInput ? moveInput.amount : undefined;

    if (typeof src !== 'number' || !Number.isInteger(src) || src < 0 || src >= 5) {
      throw new Error(`Invalid move input: sourceIndex must be an integer between 0 and 4. Got: ${src}.`);
    }

    if (typeof tgt !== 'number' || !Number.isInteger(tgt) || tgt < 0 || tgt >= 5) {
      throw new Error(`Invalid move input: targetIndex must be an integer between 0 and 4. Got: ${tgt}.`);
    }

    if (typeof amt !== 'number' || !Number.isFinite(amt) || amt < 0) {
      throw new Error(`Invalid move input: amount must be a finite non-negative number. Got: ${amt}.`);
    }

    if (this._allocationVector[src] < amt) {
      throw new Error(`Invalid move input: amount ${amt} exceeds source allocation ${this._allocationVector[src]}.`);
    }

    // Atomicity: Clone allocation vector into workspace before performing any mutation
    const allocationBefore = [...this._allocationVector];
    const nextAllocation = [...this._allocationVector];
    const trustStatesBefore = this.trustStates;

    nextAllocation[src] -= amt;
    nextAllocation[tgt] += amt;

    const sum = nextAllocation.reduce((a, b) => a + b, 0);
    if (sum !== 100) {
      throw new Error(`Allocation sum invariant breached: expected 100, got ${sum}.`);
    }

    // Compute deltas and update temporary trust states
    const rawDeltas = this._influenceMatrix.computeTrustDeltas(nextAllocation);

    // Execute update on trust components (will be reverted if worldChanges/consequences fail)
    const trustStatesAfter = this._trustComponents.map((tc, idx) => tc.updateScore(rawDeltas[idx]));
    const internalScoresAfter = this.internalScores;

    const worldChanges = this._mutationScheduler.evaluateStep6(this._turnNumber, this._influenceMatrix);
    const consequences = this._neglectTracker.evaluateStep7(this._turnNumber, trustStatesAfter);

    // Commit workspace allocation vector to canonical engine state
    for (let i = 0; i < 5; i++) {
      this._allocationVector[i] = nextAllocation[i];
    }

    const allocationAfter = [...this._allocationVector];

    const result: GSTTurnExecutionResult = {
      turnNumber: this._turnNumber,
      allocationBefore,
      allocationAfter,
      trustStatesBefore,
      trustStatesAfter,
      internalScoresAfter,
      worldChanges,
      consequences
    };

    this._turnNumber++;

    return result;
  }
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
