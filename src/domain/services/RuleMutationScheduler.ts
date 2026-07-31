import { InfluenceMatrix } from './InfluenceMatrix';

export interface WorldChangeRecord {
  turn: number;
  edgeChanged: [number, number];
  previousWeight: number;
  newWeight: number;
}

export class RuleMutationScheduler {
  private _hasTriggered: boolean = false;

  public get hasTriggered(): boolean {
    return this._hasTriggered;
  }

  /**
   * Executes scheduled world changes at Step 6 of the Turn Lifecycle.
   * If currentTurn == 11 and not yet triggered, applies mutation to InfluenceMatrix.
   */
  public evaluateStep6(turnNumber: number, matrix: InfluenceMatrix): WorldChangeRecord[] {
    if (turnNumber === 11 && !this._hasTriggered) {
      this._hasTriggered = true;
      const res = matrix.applyMutation();
      return [
        {
          turn: 11,
          edgeChanged: [res.sourceIndex, res.targetIndex],
          previousWeight: res.previousWeight,
          newWeight: res.newWeight
        }
      ];
    }
    return [];
  }
}
