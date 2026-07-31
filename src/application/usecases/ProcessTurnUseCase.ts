import { TurnAction, ValidActionType } from '../../domain/entities/TurnAction';
import { TurnEngine } from '../../domain/services/TurnEngine';
import { DeterministicRuleAI } from '../services/DeterministicRuleAI';
import { FactionId } from '../../domain/values/FactionId';
import { RegionId } from '../../domain/values/RegionId';
import { GameStateMapper } from '../mappers/GameStateMapper';
import { computeStateHash } from '../services/CanonicalHashService';
import { GameStateSnapshotDTO } from '../dtos/Snapshots';

export interface PlayerActionInputDTO {
  readonly actionType: ValidActionType;
  readonly targetRegionId: "EL_ALAMEIN" | "RAS_EL_HEKMA";
}

export interface ProcessTurnResponse {
  readonly snapshot: GameStateSnapshotDTO;
  readonly prngCallsCount: number;
  readonly stateHash: string;
}

export class ProcessTurnUseCase {
  public execute(currentSnapshot: GameStateSnapshotDTO, input: PlayerActionInputDTO | null): ProcessTurnResponse {
    const currentState = GameStateMapper.fromSnapshot(currentSnapshot);
    const actions: TurnAction[] = [];

    if (input) {
      actions.push(
        new TurnAction(
          `player-act-${currentState.turnNumber.value}`,
          new FactionId("FACTION_ALPHA"),
          new RegionId(input.targetRegionId),
          input.actionType,
          currentState.turnNumber
        )
      );
    }

    const aiAction = DeterministicRuleAI.selectAction(currentState, new FactionId("FACTION_BETA"));
    if (aiAction) {
      actions.push(aiAction);
    }

    const turnResult = TurnEngine.tick(currentState, actions);
    const snapshotDTO = GameStateMapper.toSnapshot(turnResult.newState);
    const stateHash = computeStateHash(snapshotDTO);

    return {
      snapshot: snapshotDTO,
      prngCallsCount: turnResult.prngCallsCount,
      stateHash
    };
  }
}
