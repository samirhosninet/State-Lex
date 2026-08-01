import { GameStateSnapshotDTO } from '../dtos/Snapshots';
import { GameStateMapper } from '../mappers/GameStateMapper';
import { DatasetLoader } from '../../infrastructure/config/DatasetLoader';
import { GSTTurnEngine } from '../../domain/services/TurnEngine';
import { CauseSelection, CausalContributor } from '../../domain/services/CauseSelection';
import { CausalProjection } from '../../domain/services/CausalProjection';
import { InfluenceMatrix } from '../../domain/services/InfluenceMatrix';

const CAUSE_TYPES = ['state_admin', 'investors', 'security', 'communities', 'media'];

export class StartGameUseCase {
  public execute(): GameStateSnapshotDTO {
    const loader = new DatasetLoader();
    const balanceConfig = loader.loadBalanceConfig();
    const matrixData = loader.loadInfluenceMatrix();
    const explanationConfig = loader.loadExplanationConfig();

    const engine = new GSTTurnEngine(balanceConfig, matrixData);
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

    return GameStateMapper.toGSTSnapshot(engine, explanation);
  }
}
