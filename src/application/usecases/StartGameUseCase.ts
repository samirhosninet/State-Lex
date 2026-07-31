import { GameStateSnapshotDTO } from '../dtos/Snapshots';
import { GameStateMapper } from '../mappers/GameStateMapper';
import { createInitialGameState } from '../../domain/services/InitialGameStateFactory';

export class StartGameUseCase {
  public execute(gameId = "game-001", seedValue = 123456789): GameStateSnapshotDTO {
    const state = createInitialGameState(gameId, seedValue);
    return GameStateMapper.toSnapshot(state);
  }
}
