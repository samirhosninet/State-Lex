import { GameState } from '../../domain/aggregates/GameState';
import { createInitialGameState } from '../../domain/services/InitialGameStateFactory';

export class StartGameUseCase {
  public execute(gameId = "game-001", seedValue = 123456789): GameState {
    return createInitialGameState(gameId, seedValue);
  }
}
