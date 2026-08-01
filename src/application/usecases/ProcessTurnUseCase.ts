import { GSTAllocationMoveInput } from '../../domain/services/TurnEngine';
import { GameStateMapper } from '../mappers/GameStateMapper';
import { computeStateHash } from '../services/CanonicalHashService';
import { GameStateSnapshotDTO } from '../dtos/Snapshots';
import { DatasetLoader } from '../../infrastructure/config/DatasetLoader';
import { InfluenceMatrix } from '../../domain/services/InfluenceMatrix';
import { CauseSelection, CausalContributor } from '../../domain/services/CauseSelection';
import { CausalProjection } from '../../domain/services/CausalProjection';

const CAUSE_TYPES = ['state_admin', 'investors', 'security', 'communities', 'media'];

export interface ProcessTurnResponse {
  readonly snapshot: GameStateSnapshotDTO;
  readonly prngCallsCount: number;
  readonly stateHash: string;
}

export type ProcessTurnInput = GSTAllocationMoveInput | { actionType?: string; targetRegionId?: string } | null;

export class ProcessTurnUseCase {
  public execute(
    currentSnapshot: GameStateSnapshotDTO,
    moveInput: ProcessTurnInput
  ): ProcessTurnResponse {
    const loader = new DatasetLoader();
    const balanceConfig = loader.loadBalanceConfig();
    const matrixData = loader.loadInfluenceMatrix();
    const explanationConfig = loader.loadExplanationConfig();

    const engine = GameStateMapper.fromGSTSnapshot(currentSnapshot, balanceConfig, matrixData);

    let lastMoveDTO;
    if (moveInput) {
      if ('sourceIndex' in moveInput && 'targetIndex' in moveInput && typeof moveInput.sourceIndex === 'number') {
        const gstMove: GSTAllocationMoveInput = {
          sourceIndex: moveInput.sourceIndex,
          targetIndex: moveInput.targetIndex,
          amount: typeof moveInput.amount === 'number' ? moveInput.amount : 5
        };
        engine.executeTurn(gstMove);
        lastMoveDTO = gstMove;
      } else {
        // Default GST allocation move for legacy callers
        const defaultMove: GSTAllocationMoveInput = { sourceIndex: 4, targetIndex: 0, amount: 5 };
        engine.executeTurn(defaultMove);
        lastMoveDTO = defaultMove;
      }
    }

    const matrix = new InfluenceMatrix(matrixData);
    const rawDeltas = matrix.computeTrustDeltas(engine.allocationVector);

    const contributors: CausalContributor[] = rawDeltas.map((impact, idx) => ({
      actor_index: idx,
      cause_type_index: idx,
      cause_type: CAUSE_TYPES[idx],
      impact
    }));

    const dominantCauses = CauseSelection.selectDominantCauses(contributors, explanationConfig);
    const projection = CausalProjection.project(dominantCauses, explanationConfig);

    const explanation = {
      dominantCauses,
      category: projection.category,
      intensity: projection.intensity
    };

    const snapshotDTO = GameStateMapper.toGSTSnapshot(engine, explanation, lastMoveDTO);
    const stateHash = computeStateHash(snapshotDTO);

    return {
      snapshot: snapshotDTO,
      prngCallsCount: 0,
      stateHash
    };
  }
}
