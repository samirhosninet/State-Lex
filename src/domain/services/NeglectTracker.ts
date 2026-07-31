import { TrustState } from './TrustComponent';

export interface ConsequenceRecord {
  turn: number;
  actorIndex: number;
  eventId: string;
}

export class NeglectTracker {
  private readonly _belowThresholdCounter: number[] = [0, 0, 0, 0, 0];
  private readonly _hasTriggered: boolean[] = [false, false, false, false, false];

  /**
   * Evaluates Step 7 of Turn Lifecycle.
   * Tracks consecutive below-threshold turns (Unstable or Hostile) and fires idempotent consequence after 3 turns.
   */
  public evaluateStep7(turnNumber: number, trustStates: TrustState[]): ConsequenceRecord[] {
    const consequences: ConsequenceRecord[] = [];

    for (let i = 0; i < 5; i++) {
      const state = trustStates[i];
      const isBelowThreshold = state === TrustState.Unstable || state === TrustState.Hostile;

      if (isBelowThreshold) {
        this._belowThresholdCounter[i]++;
        if (this._belowThresholdCounter[i] >= 3 && !this._hasTriggered[i]) {
          this._hasTriggered[i] = true;
          consequences.push({
            turn: turnNumber,
            actorIndex: i,
            eventId: `evt_neglect_actor_${i}`
          });
        }
      } else {
        this._belowThresholdCounter[i] = 0;
      }
    }

    return consequences;
  }
}
