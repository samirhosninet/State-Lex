import { DeterministicMath } from './DeterministicMath';
import { BalanceConfigData } from './MatrixSchemaValidator';

export enum TrustState {
  Healthy = "Healthy",
  Unstable = "Unstable",
  Hostile = "Hostile"
}

export interface TrustTransitionResult {
  readonly score: number;
  readonly state: TrustState;
}

export class TrustComponent {
  private _internalScore: number;
  private _visibleState: TrustState;
  private readonly _thresholds: BalanceConfigData['hysteresisThresholds'];

  constructor(initialScore: number, thresholds: BalanceConfigData['hysteresisThresholds']) {
    this._internalScore = initialScore;
    this._thresholds = thresholds;
    this._visibleState = this.evaluateState(initialScore, TrustState.Healthy);
  }

  public get internalScore(): number {
    return this._internalScore;
  }

  public get visibleState(): TrustState {
    return this._visibleState;
  }

  /**
   * Shared transition calculation routine (D-3 / AC-3b).
   * Computes the new clamped score and visible state without mutating instance state.
   */
  private computeTransition(delta: number): TrustTransitionResult {
    const rawScore = this._internalScore + delta;
    const score = DeterministicMath.clampTrustScore(rawScore);
    const state = this.evaluateState(score, this._visibleState);
    return { score, state };
  }

  /**
   * Non-mutating preview of trust transition (CTR-C / CTR-E).
   * MUST NOT modify any observable or internal state of the TrustComponent instance.
   */
  public previewTransition(delta: number): TrustTransitionResult {
    return this.computeTransition(delta);
  }

  /**
   * Non-mutating preview returning only TrustState (CTR-E / AC-3a).
   */
  public previewUpdate(delta: number): TrustState {
    return this.computeTransition(delta).state;
  }

  /**
   * Updates internal score with delta and evaluates hysteresis state transitions.
   */
  public updateScore(delta: number): TrustState {
    const { score, state } = this.computeTransition(delta);
    this.commitTransition(score, state);
    return state;
  }

  /**
   * Commits precomputed transition into instance state without recomputation (Commit-Safe).
   */
  public commitTransition(score: number, state: TrustState): void {
    this._internalScore = score;
    this._visibleState = state;
  }

  /**
   * Explicitly sets internal score and updates visible hysteresis state.
   */
  public setScore(score: number): void {
    this._internalScore = DeterministicMath.clampTrustScore(score);
    this._visibleState = this.evaluateState(this._internalScore, this._visibleState);
  }

  /**
   * Hysteresis evaluation logic preventing flicker at state boundaries.
   */
  private evaluateState(score: number, currentState: TrustState): TrustState {
    if (currentState === TrustState.Healthy) {
      if (score <= this._thresholds.HostileEntry) return TrustState.Hostile;
      if (score <= this._thresholds.UnstableEntry) return TrustState.Unstable;
      return TrustState.Healthy;
    }

    if (currentState === TrustState.Unstable) {
      if (score <= this._thresholds.HostileEntry) return TrustState.Hostile;
      if (score >= this._thresholds.UnstableExit) return TrustState.Healthy;
      return TrustState.Unstable;
    }

    if (currentState === TrustState.Hostile) {
      if (score >= this._thresholds.UnstableExit) return TrustState.Healthy;
      if (score >= this._thresholds.HostileExit) return TrustState.Unstable;
      return TrustState.Hostile;
    }

    return currentState;
  }
}
