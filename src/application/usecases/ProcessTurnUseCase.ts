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

export type ProcessTurnInput = GSTAllocationMoveInput | Record<string, unknown> | null;

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
      const src = (moveInput as Record<string, unknown>).sourceIndex;
      const tgt = (moveInput as Record<string, unknown>).targetIndex;

      if (typeof src !== 'number' || !Number.isFinite(src) || typeof tgt !== 'number' || !Number.isFinite(tgt)) {
        throw new Error(
          "Invalid ProcessTurnInput: expected GSTAllocationMoveInput with finite numeric sourceIndex and targetIndex. Legacy action-based payloads are not supported by the GST runtime."
        );
      }

      const amtRaw = (moveInput as Record<string, unknown>).amount;
      const amt = typeof amtRaw === 'number' && Number.isFinite(amtRaw) ? amtRaw : 5;

      const gstMove: GSTAllocationMoveInput = {
        sourceIndex: src,
        targetIndex: tgt,
        amount: amt
      };

      engine.executeTurn(gstMove);
      lastMoveDTO = gstMove;
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
