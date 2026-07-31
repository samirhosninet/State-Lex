import { SnapshotEnvelopeDTO } from '../dtos/Snapshots';

export type { SnapshotEnvelopeDTO };

export interface IPersistencePort {
  saveSnapshot(envelope: SnapshotEnvelopeDTO): Promise<boolean>;
  loadActiveSnapshot(): Promise<SnapshotEnvelopeDTO | null>;
  clearSnapshot(): Promise<void>;
}
