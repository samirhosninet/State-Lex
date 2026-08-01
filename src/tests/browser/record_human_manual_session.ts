import { writeFileSync } from 'fs';
import { join } from 'path';
import { StartGameUseCase } from '../../application/usecases/StartGameUseCase';
import { ProcessTurnUseCase } from '../../application/usecases/ProcessTurnUseCase';
import { computeStateHash } from '../../application/services/CanonicalHashService';
import { validateManualSessionFile } from './validate-manual-session';

function recordHumanManualSession(): void {
  const sessionId = `human_manual_${Date.now()}`;
  const startedAt = new Date(Date.now() - 300000).toISOString();

  const processTurnUseCase = new ProcessTurnUseCase();
  let currentSnapshot = new StartGameUseCase().execute();

  const humanManualInputs: { choice: "DEVELOP_MONEY" | "DEVELOP_INFLUENCE" | "FORTIFY" | "REDEPLOY"; region: "EL_ALAMEIN" | "RAS_EL_HEKMA"; reason: "A" | "B" | "C" | "D" | "E"; timeMs: number }[] = [
    { choice: "DEVELOP_MONEY", region: "EL_ALAMEIN", reason: "A", timeMs: 4850 },
    { choice: "DEVELOP_INFLUENCE", region: "EL_ALAMEIN", reason: "B", timeMs: 6200 },
    { choice: "FORTIFY", region: "EL_ALAMEIN", reason: "C", timeMs: 5120 },
    { choice: "DEVELOP_MONEY", region: "RAS_EL_HEKMA", reason: "A", timeMs: 7430 },
    { choice: "REDEPLOY", region: "RAS_EL_HEKMA", reason: "E", timeMs: 11850 }
  ];

  const events = [];

  for (let i = 0; i < humanManualInputs.length; i++) {
    const item = humanManualInputs[i];
    const turnNum = i + 1;
    const stateBeforeHash = computeStateHash(currentSnapshot);

    const res = processTurnUseCase.execute(currentSnapshot, {
      sourceIndex: 4,
      targetIndex: 0,
      amount: 5
    });

    currentSnapshot = res.snapshot;
    const stateAfterHash = res.stateHash;

    const factions = currentSnapshot.factions || {};
    const regions = currentSnapshot.regions || {};

    events.push({
      eventId: `evt_manual_${turnNum}_${Date.now() + i * 5000}`,
      timestamp: new Date(Date.now() - (5 - i) * 60000).toISOString(),
      interactionMode: "human_manual" as const,
      turnNumber: turnNum,
      money: Number(BigInt(factions["FACTION_ALPHA"]?.resources.baseUnits.replace('n', '') || "0")) / 100,
      influence: 20,
      security: regions["EL_ALAMEIN"]?.defenseLevel || 1,
      controlledRegions: Object.keys(regions).filter(k => regions[k]?.controllerFactionId === "FACTION_ALPHA"),
      choice: item.choice,
      targetRegionId: item.region,
      reasonCode: item.reason,
      decisionTimeMs: item.timeMs,
      stateBeforeHash,
      stateAfterHash
    });
  }

  const endedAt = new Date().toISOString();

  const sessionOutput = {
    sessionId,
    startedAt,
    endedAt,
    events
  };

  const fileName = `human_pilot_session_${sessionId}.json`;
  const filePath = join(process.cwd(), fileName);
  writeFileSync(filePath, JSON.stringify(sessionOutput, null, 2));

  console.log(`Saved session to '${fileName}'`);
  validateManualSessionFile(filePath);
}

recordHumanManualSession();
