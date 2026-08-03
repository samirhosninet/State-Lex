import { InfluenceMatrix } from './InfluenceMatrix';

export interface WorldChangeRecord {
  turn: number;
  edgeChanged: [number, number];
  previousWeight: number;
  newWeight: number;
}

export interface PendingStep6Mutation {
  turn: number;
  mutationPreview: {
    sourceIndex: number;
    targetIndex: number;
    previousWeight: number;
    newWeight: number;
  };
}

export class RuleMutationScheduler {
  private _hasTriggered: boolean = false;

  public get hasTriggered(): boolean {
    return this._hasTriggered;
  }

  /**
   * Previews scheduled world changes at Step 6 of the Turn Lifecycle without mutating state.
   */
  public previewStep6(turnNumber: number, matrix: InfluenceMatrix): PendingStep6Mutation | null {
    if (turnNumber === 11 && !this._hasTriggered) {
      const res = matrix.previewMutation();
      return {
        turn: 11,
        mutationPreview: res
      };
    }
    return null;
  }

  /**
   * Commits an already previewed Step 6 world change inside the Commit Barrier.
   */
  public commitStep6(pending: PendingStep6Mutation | null, matrix: InfluenceMatrix): WorldChangeRecord[] {
    if (pending !== null && pending.turn === 11 && !this._hasTriggered) {
      this._hasTriggered = true;
      const { sourceIndex, targetIndex, previousWeight, newWeight } = pending.mutationPreview;
      matrix.commitMutation(sourceIndex, targetIndex, newWeight);
      return [
        {
          turn: 11,
          edgeChanged: [sourceIndex, targetIndex],
          previousWeight,
          newWeight
        }
      ];
    }
    return [];
  }
}
