export interface SnapshotEnvelopeDTO {
  readonly schemaVersion: string;
  readonly state: Record<string, unknown>;
  readonly stateHash: string;
}

export interface IPersistencePort {
  saveSnapshot(envelope: SnapshotEnvelopeDTO): Promise<boolean>;
  loadActiveSnapshot(): Promise<SnapshotEnvelopeDTO | null>;
  clearSnapshot(): Promise<void>;
}
