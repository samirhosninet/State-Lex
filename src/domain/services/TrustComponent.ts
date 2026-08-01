import { DeterministicMath } from './DeterministicMath';
import { BalanceConfigData } from './MatrixSchemaValidator';

export enum TrustState {
  Healthy = "Healthy",
  Unstable = "Unstable",
  Hostile = "Hostile"
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
   * Updates internal score with delta, applies clamp [0, 100], and evaluates hysteresis state transitions.
   */
  public updateScore(delta: number): TrustState {
    const rawScore = this._internalScore + delta;
    this._internalScore = DeterministicMath.clampTrustScore(rawScore);
    this._visibleState = this.evaluateState(this._internalScore, this._visibleState);
    return this._visibleState;
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
