import { IPersistencePort } from '../ports/IPersistencePort';
import { computeStateHash } from '../services/CanonicalHashService';
import { GameStateSnapshotDTO } from '../dtos/Snapshots';

export class LoadGameUseCase {
  constructor(private readonly persistencePort: IPersistencePort) {}

  public async execute(): Promise<GameStateSnapshotDTO | null> {
    const envelope = await this.persistencePort.loadActiveSnapshot();
    if (!envelope) return null;

    if (envelope.schemaVersion !== "1.0.0") {
      throw new Error(`Snapshot schema version mismatch: '${envelope.schemaVersion}'. Expected '1.0.0'.`);
    }

    const computedHash = computeStateHash(envelope.state);
    if (computedHash !== envelope.stateHash) {
      throw new Error(`Snapshot corrupted: stored hash '${envelope.stateHash}' does not match computed hash '${computedHash}'.`);
    }

    return envelope.state;
  }
}
