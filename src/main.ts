import { GSTTurnEngine } from './domain/services/TurnEngine';
import { DatasetLoader } from './infrastructure/config/DatasetLoader';
import { GameStateMapper } from './application/mappers/GameStateMapper';
import { computeStateHash } from './application/services/CanonicalHashService';
import { SnapshotEnvelopeDTO } from './application/dtos/Snapshots';
import { IndexedDBStorageAdapter } from './infrastructure/persistence/IndexedDBStorageAdapter';
import { GameView } from './presentation/GameView';

export interface ChromiumTestResult {
  readonly originalHash: string;
  readonly persistedHash: string;
  readonly rehydratedHash: string;
  readonly originalEqualsPersisted: boolean;
  readonly persistedEqualsRehydrated: boolean;
  readonly roundTripIdentity: boolean;
}

export async function runRoundTripIdentityTest(): Promise<ChromiumTestResult> {
  const loader = new DatasetLoader();
  const balanceConfig = loader.loadBalanceConfig();
  const matrixData = loader.loadInfluenceMatrix();

  const engine = new GSTTurnEngine(balanceConfig, matrixData);
  // Execute test allocation move (5 from Media [4] to StateAdmin [0])
  engine.executeTurn({ sourceIndex: 4, targetIndex: 0, amount: 5 });

  const originalSnapshotDTO = GameStateMapper.toGSTSnapshot(engine);
  const originalHash = computeStateHash(originalSnapshotDTO);

  const envelope: SnapshotEnvelopeDTO = {
    schemaVersion: "1.0.0",
    state: originalSnapshotDTO,
    stateHash: originalHash
  };

  const storage = new IndexedDBStorageAdapter();
  await storage.clearSnapshot();
  await storage.saveSnapshot(envelope);

  const loadedEnvelope = await storage.loadActiveSnapshot();
  if (!loadedEnvelope) {
    throw new Error("Failed to load snapshot from Chromium IndexedDB");
  }
  const persistedHash = loadedEnvelope.stateHash;

  const rehydratedEngine = GameStateMapper.fromGSTSnapshot(loadedEnvelope.state, balanceConfig, matrixData);
  const rehydratedSnapshotDTO = GameStateMapper.toGSTSnapshot(rehydratedEngine);
  const rehydratedHash = computeStateHash(rehydratedSnapshotDTO);

  return {
    originalHash,
    persistedHash,
    rehydratedHash,
    originalEqualsPersisted: originalHash === persistedHash,
    persistedEqualsRehydrated: persistedHash === rehydratedHash,
    roundTripIdentity: originalHash === persistedHash && persistedHash === rehydratedHash
  };
}

(window as unknown as Record<string, unknown>).runRoundTripIdentityTest = runRoundTripIdentityTest;

// Initialize Playable Vertical Slice UI if #app exists
if (typeof document !== 'undefined') {
  const appContainer = document.getElementById('app');
  if (appContainer) {
    new GameView(appContainer);
  }
}
