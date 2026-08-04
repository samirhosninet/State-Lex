import { GameState } from '../aggregates/GameState';
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

  public get trustComponents(): TrustComponent[] {
    return this._trustComponents;
  }

  public get mutationScheduler(): RuleMutationScheduler {
    return this._mutationScheduler;
  }

  public get influenceMatrix(): InfluenceMatrix {
    return this._influenceMatrix;
  }

  public get neglectTracker(): NeglectTracker {
    return this._neglectTracker;
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

    // Workspace Allocation
    const allocationBefore = [...this._allocationVector];
    const nextAllocation = [...this._allocationVector];
    const trustStatesBefore = this.trustStates;

    nextAllocation[src] -= amt;
    nextAllocation[tgt] += amt;

    const sum = nextAllocation.reduce((a, b) => a + b, 0);
    if (sum !== 100) {
      throw new Error(`Allocation sum invariant breached: expected 100, got ${sum}.`);
    }

    // Compute rawDeltas
    const rawDeltas = this._influenceMatrix.computeTrustDeltas(nextAllocation);

    // Compute preview updates without mutating TrustComponents
    const transitions = this._trustComponents.map((tc, idx) => tc.previewTransition(rawDeltas[idx]));
    const trustStatesAfter = transitions.map(t => t.state);
    const internalScoresAfter = transitions.map(t => t.score);

    // Preview world changes (non-mutating) and evaluate consequences (can throw)
    const pendingStep6 = this._mutationScheduler.previewStep6(this._turnNumber, this._influenceMatrix);
    const consequences = this._neglectTracker.evaluateStep7(this._turnNumber, trustStatesAfter);

    // COMMIT BARRIER START — Commit-Safe operations only below this line until BARRIER END
    for (let i = 0; i < 5; i++) {
      this._allocationVector[i] = nextAllocation[i];
    }

    for (let i = 0; i < 5; i++) {
      this._trustComponents[i].commitTransition(transitions[i].score, transitions[i].state);
    }

    const worldChanges = this._mutationScheduler.commitStep6(pendingStep6, this._influenceMatrix);

    const currentTurnNumber = this._turnNumber;
    this._turnNumber++;
    // COMMIT BARRIER END

    const allocationAfter = [...this._allocationVector];

    const result: GSTTurnExecutionResult = {
      turnNumber: currentTurnNumber,
      allocationBefore,
      allocationAfter,
      trustStatesBefore,
      trustStatesAfter,
      internalScoresAfter,
      worldChanges,
      consequences
    };

    return result;
  }
}

