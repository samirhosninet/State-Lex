import { IPersistencePort } from '../../application/ports/IPersistencePort';
import { SnapshotEnvelopeDTO } from '../../application/dtos/Snapshots';

export class MemoryStorageAdapter implements IPersistencePort {
  private _activeSave: SnapshotEnvelopeDTO | null = null;

  public async saveSnapshot(envelope: SnapshotEnvelopeDTO): Promise<boolean> {
    this._activeSave = envelope;
    return true;
  }

  public async loadActiveSnapshot(): Promise<SnapshotEnvelopeDTO | null> {
    return this._activeSave;
  }

  public async clearSnapshot(): Promise<void> {
    this._activeSave = null;
  }
}
