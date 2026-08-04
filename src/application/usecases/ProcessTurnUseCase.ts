import { GSTAllocationMoveInput } from '../../domain/services/TurnEngine';
import { GameStateMapper } from '../mappers/GameStateMapper';
import { computeStateHash } from '../services/CanonicalHashService';
import { GameStateSnapshotDTO } from '../dtos/Snapshots';
import { DatasetLoader } from '../../infrastructure/config/DatasetLoader';
import { InfluenceMatrix } from '../../domain/services/InfluenceMatrix';
import { CauseSelection, CausalContributor } from '../../domain/services/CauseSelection';
import { CausalProjection } from '../../domain/services/CausalProjection';

const CAUSE_TYPES = ['state_admin', 'investors', 'security', 'communities', 'media'];

export interface WorldChangeRecordDTO {
  readonly turn: number;
  readonly edgeChanged: readonly [number, number];
  readonly previousWeight: number;
  readonly newWeight: number;
}

export interface ConsequenceRecordDTO {
  readonly turn: number;
  readonly actorIndex: number;
  readonly eventId: string;
}

export interface TurnTelemetryDTO {
  readonly worldChanges: readonly WorldChangeRecordDTO[];
  readonly consequences: readonly ConsequenceRecordDTO[];
}

export interface ProcessTurnResponse {
  readonly snapshot: GameStateSnapshotDTO;
  readonly prngCallsCount: number;
  readonly stateHash: string;
  readonly telemetry?: TurnTelemetryDTO;
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
    let turnTelemetry: TurnTelemetryDTO | undefined;
    if (moveInput) {
      const src = (moveInput as Record<string, unknown>).sourceIndex;
      const tgt = (moveInput as Record<string, unknown>).targetIndex;
      const amt = (moveInput as Record<string, unknown>).amount;

      if (
        typeof src !== 'number' ||
        !Number.isInteger(src) ||
        src < 0 ||
        src >= 5 ||
        typeof tgt !== 'number' ||
        !Number.isInteger(tgt) ||
        tgt < 0 ||
        tgt >= 5 ||
        typeof amt !== 'number' ||
        !Number.isFinite(amt) ||
        amt < 0
      ) {
        throw new Error(
          "Invalid ProcessTurnInput: expected GSTAllocationMoveInput with finite numeric sourceIndex and targetIndex. Legacy action-based payloads are not supported by the GST runtime."
        );
      }

      const gstMove: GSTAllocationMoveInput = {
        sourceIndex: src,
        targetIndex: tgt,
        amount: amt
      };

      const turnResult = engine.executeTurn(gstMove);
      lastMoveDTO = gstMove;
      turnTelemetry = {
        worldChanges: turnResult.worldChanges.map(wc => ({
          turn: wc.turn,
          edgeChanged: wc.edgeChanged,
          previousWeight: wc.previousWeight,
          newWeight: wc.newWeight
        })),
        consequences: turnResult.consequences.map(c => ({
          turn: c.turn,
          actorIndex: c.actorIndex,
          eventId: c.eventId
        }))
      };
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
      stateHash,
      telemetry: turnTelemetry
    };
  }
}
