import { MatrixSchemaData } from './MatrixSchemaValidator';
import { DeterministicMath } from './DeterministicMath';

export class InfluenceMatrix {
  private readonly _edgeWeights: number[][];
  private readonly _turn11Mutation: MatrixSchemaData['turn11Mutation'];

  constructor(data: MatrixSchemaData) {
    // Deep clone edge weights
    this._edgeWeights = data.edgeWeights.map(row => [...row]);
    this._turn11Mutation = { ...data.turn11Mutation };
  }

  public getEdgeWeight(sourceIndex: number, targetIndex: number): number {
    return this._edgeWeights[sourceIndex][targetIndex];
  }

  /**
   * Computes raw trust deltas for all 5 actors based on absolute allocation state.
   * Formula: raw_delta[actor] = sum over source ( allocation[source] * edge_weight[source][actor] )
   * Rounding is applied once per target actor after full 5-actor summation.
   */
  public computeTrustDeltas(allocationVector: number[]): number[] {
    const deltas: number[] = [0, 0, 0, 0, 0];

    for (let target = 0; target < 5; target++) {
      let sum = 0;
      for (let source = 0; source < 5; source++) {
        sum += allocationVector[source] * this._edgeWeights[source][target];
      }
      deltas[target] = DeterministicMath.roundPostFormula(sum);
    }

    return deltas;
  }

  /**
   * Executes Turn 11 step 6 edge mutation payload.
   * Modifies edge weights non-retroactively for Turn 12+ calculations.
   */
  public applyMutation(): { sourceIndex: number; targetIndex: number; previousWeight: number; newWeight: number } {
    const sourceIndex = 0; // StateAdministration
    const targetIndex = 1; // Investors
    const previousWeight = this._edgeWeights[sourceIndex][targetIndex];
    const newWeight = this._turn11Mutation.newWeight;

    this._edgeWeights[sourceIndex][targetIndex] = newWeight;

    return {
      sourceIndex,
      targetIndex,
      previousWeight,
      newWeight
    };
  }
}
