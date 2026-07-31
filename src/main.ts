import { createInitialGameState } from './domain/services/InitialGameStateFactory';
import { TurnEngine } from './domain/services/TurnEngine';
import { TurnAction } from './domain/entities/TurnAction';
import { FactionId } from './domain/values/FactionId';
import { RegionId } from './domain/values/RegionId';
import { TurnNumber } from './domain/values/TurnNumber';
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
  const initialState = createInitialGameState("game-001", 123456789);
  const action1 = new TurnAction("act-1", new FactionId("FACTION_ALPHA"), new RegionId("EL_ALAMEIN"), "DEVELOP", new TurnNumber(1));
  const action2 = new TurnAction("act-2", new FactionId("FACTION_BETA"), new RegionId("RAS_EL_HEKMA"), "FORTIFY", new TurnNumber(1));

  const turnResult = TurnEngine.tick(initialState, [action1, action2]);
  const originalState = turnResult.newState;

  const originalSnapshotDTO = GameStateMapper.toSnapshot(originalState);
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

  const rehydratedState = GameStateMapper.fromSnapshot(loadedEnvelope.state);
  const rehydratedSnapshotDTO = GameStateMapper.toSnapshot(rehydratedState);
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
