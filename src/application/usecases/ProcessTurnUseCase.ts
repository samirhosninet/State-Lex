import { GameState } from '../../domain/aggregates/GameState';
import { TurnAction } from '../../domain/entities/TurnAction';
import { TurnEngine } from '../../domain/services/TurnEngine';
import { DeterministicRuleAI } from '../services/DeterministicRuleAI';
import { FactionId } from '../../domain/values/FactionId';
import { GameStateMapper } from '../mappers/GameStateMapper';
import { computeStateHash } from '../services/CanonicalHashService';

export interface ProcessTurnResponse {
  readonly newState: GameState;
  readonly prngCallsCount: number;
  readonly stateHash: string;
}

export class ProcessTurnUseCase {
  public execute(currentState: GameState, playerAction: TurnAction | null): ProcessTurnResponse {
    const actions: TurnAction[] = [];

    if (playerAction) {
      actions.push(playerAction);
    }

    // AI Action for FACTION_BETA
    const aiAction = DeterministicRuleAI.selectAction(currentState, new FactionId("FACTION_BETA"));
    if (aiAction) {
      actions.push(aiAction);
    }

    const turnResult = TurnEngine.tick(currentState, actions);
    const snapshotDTO = GameStateMapper.toSnapshot(turnResult.newState);
    const stateHash = computeStateHash(snapshotDTO);

    return {
      newState: turnResult.newState,
      prngCallsCount: turnResult.prngCallsCount,
      stateHash
    };
  }
}
