import { GameState } from '../../domain/aggregates/GameState';
import { IPersistencePort } from '../ports/IPersistencePort';
import { GameStateMapper } from '../mappers/GameStateMapper';
import { computeStateHash } from '../services/CanonicalHashService';
import { SnapshotEnvelopeDTO } from '../dtos/Snapshots';

export class SaveGameUseCase {
  constructor(private readonly persistencePort: IPersistencePort) {}

  public async execute(state: GameState): Promise<boolean> {
    const snapshotDTO = GameStateMapper.toSnapshot(state);
    const stateHash = computeStateHash(snapshotDTO);

    const envelope: SnapshotEnvelopeDTO = {
      schemaVersion: "1.0.0",
      state: snapshotDTO,
      stateHash
    };

    return await this.persistencePort.saveSnapshot(envelope);
  }
}
