import { IPersistencePort } from '../ports/IPersistencePort';
import { computeStateHash } from '../services/CanonicalHashService';
import { SnapshotEnvelopeDTO, GameStateSnapshotDTO } from '../dtos/Snapshots';

export class SaveGameUseCase {
  constructor(private readonly persistencePort: IPersistencePort) {}

  public async execute(snapshot: GameStateSnapshotDTO): Promise<boolean> {
    const stateHash = computeStateHash(snapshot);

    const envelope: SnapshotEnvelopeDTO = {
      schemaVersion: "1.0.0",
      state: snapshot,
      stateHash
    };

    return await this.persistencePort.saveSnapshot(envelope);
  }
}
