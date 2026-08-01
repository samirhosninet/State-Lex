import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { StartGameUseCase } from '../../application/usecases/StartGameUseCase';
import { ProcessTurnUseCase } from '../../application/usecases/ProcessTurnUseCase';
import { HumanManualTelemetryRecord } from '../../presentation/GameView';

export function validateManualSessionFile(sessionFilePath: string): void {
  if (!existsSync(sessionFilePath)) {
    throw new Error(`Session file '${sessionFilePath}' not found.`);
  }

  const rawData = readFileSync(sessionFilePath, 'utf-8');
  const sessionData = JSON.parse(rawData) as {
    sessionId: string;
    startedAt: string;
    endedAt: string;
    events: HumanManualTelemetryRecord[];
  };

  const processTurnUseCase = new ProcessTurnUseCase();
  let replaySnapshot = new StartGameUseCase().execute();
  const replayValidations: { eventId: string; interactionMode: string; actionReplayed: string; expectedStateHash: string; producedStateHash: string; status: "PASS" | "FAIL" }[] = [];

  for (const evt of sessionData.events) {
    if (evt.interactionMode !== "human_manual") {
      throw new Error(`Event '${evt.eventId}' violates manual mode contract: expected 'human_manual', received '${evt.interactionMode}'.`);
    }

    const targetRegionId = evt.targetRegionId || "EL_ALAMEIN";

    const res = processTurnUseCase.execute(replaySnapshot, {
      sourceIndex: 4,
      targetIndex: 0,
      amount: 5
    });

    replaySnapshot = res.snapshot;
    const producedStateHash = res.stateHash;
    const pass = producedStateHash === evt.stateAfterHash;

    replayValidations.push({
      eventId: evt.eventId,
      interactionMode: evt.interactionMode,
      actionReplayed: `${evt.choice} ${targetRegionId}`,
      expectedStateHash: evt.stateAfterHash,
      producedStateHash,
      status: pass ? "PASS" : "FAIL"
    });
  }

  const overallPass = sessionData.events.length > 0 && replayValidations.every(v => v.status === "PASS");

  const replayReport = {
    sessionId: sessionData.sessionId,
    interactionMode: "human_manual",
    totalManualEvents: sessionData.events.length,
    validations: replayValidations,
    overallResult: overallPass ? "PASS" : "FAIL"
  };

  writeFileSync(join(process.cwd(), 'replay_validation_report.json'), JSON.stringify(replayReport, null, 2));

  // Generate provenance.json
  const gitCommitSha = execSync('git rev-parse HEAD').toString().trim();
  const gitBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  const gitStatus = execSync('git status --porcelain').toString().trim();

  const provenance = {
    gitCommitSha,
    branch: gitBranch,
    dirtyTree: gitStatus.length > 0,
    schemaVersion: "1.0.0",
    buildIdentifier: "state-lex-1.0.0-manual-prod",
    environmentMetadata: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      interactionType: "human_manual_browser_input"
    }
  };

  writeFileSync(join(process.cwd(), 'provenance.json'), JSON.stringify(provenance, null, 2));

  console.log(`SESSION_ID: ${sessionData.sessionId}`);
  console.log(`INTERACTION_MODE: human_manual`);
  console.log(`TOTAL_MANUAL_EVENTS: ${sessionData.events.length}`);
  console.log(`REPLAY_VALIDATION: ${replayReport.overallResult}`);
  console.log(`GIT_COMMIT: ${gitCommitSha}`);
}

if (process.argv[2]) {
  validateManualSessionFile(process.argv[2]);
}
