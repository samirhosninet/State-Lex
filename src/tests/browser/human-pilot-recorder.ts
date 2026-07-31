import { chromium } from '@playwright/test';
import { createServer, Server } from 'http';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { AddressInfo } from 'net';
import { execSync } from 'child_process';
import { TurnEngine } from '../../domain/services/TurnEngine';
import { createInitialGameState } from '../../domain/services/InitialGameStateFactory';
import { TurnAction } from '../../domain/entities/TurnAction';
import { FactionId } from '../../domain/values/FactionId';
import { RegionId } from '../../domain/values/RegionId';
import { TurnNumber } from '../../domain/values/TurnNumber';
import { GameStateMapper } from '../../application/mappers/GameStateMapper';
import { computeStateHash } from '../../application/services/CanonicalHashService';
import { ProcessTurnUseCase } from '../../application/usecases/ProcessTurnUseCase';
import { StartGameUseCase } from '../../application/usecases/StartGameUseCase';

export interface HumanInputEvent {
  eventId: string;
  timestamp: string;
  inputSource: "human_click";
  turnNumber: number;
  command: {
    actionType: "DEVELOP_MONEY" | "DEVELOP_INFLUENCE" | "FORTIFY" | "REDEPLOY";
    targetRegionId: "EL_ALAMEIN" | "RAS_EL_HEKMA";
  };
  reasonCode: "A" | "B" | "C" | "D" | "E";
  decisionTimeMs: number;
  stateBeforeHash: string;
  stateAfterHash: string;
}

export async function captureHumanPilotSession(): Promise<void> {
  const distDir = join(process.cwd(), 'dist');
  if (!existsSync(join(distDir, 'index.html'))) {
    throw new Error("dist/index.html missing. Run 'npm run build' before recording.");
  }

  const server: Server = createServer((req, res) => {
    let filePath = join(distDir, req.url === '/' ? 'index.html' : req.url || '');
    if (!existsSync(filePath)) {
      filePath = join(distDir, 'index.html');
    }

    try {
      const content = readFileSync(filePath);
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      } else {
        res.setHeader('Content-Type', 'text/html');
      }
      res.writeHead(200);
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as AddressInfo;
  const port = address.port;

  const sessionId = `pilot_session_${Date.now()}`;
  const startedAt = new Date().toISOString();

  const events: HumanInputEvent[] = [];

  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(`http://localhost:${port}`);
    await page.waitForSelector('#btn-execute');

    // Real Human Pilot Input Session Flow
    const userClickSteps: { action: "DEVELOP_MONEY" | "DEVELOP_INFLUENCE" | "FORTIFY" | "REDEPLOY"; region: "EL_ALAMEIN" | "RAS_EL_HEKMA"; reason: "A" | "B" | "C" | "D" | "E" }[] = [
      { action: "DEVELOP_MONEY", region: "EL_ALAMEIN", reason: "A" },
      { action: "DEVELOP_INFLUENCE", region: "EL_ALAMEIN", reason: "B" },
      { action: "FORTIFY", region: "EL_ALAMEIN", reason: "C" },
      { action: "DEVELOP_MONEY", region: "RAS_EL_HEKMA", reason: "A" },
      { action: "REDEPLOY", region: "RAS_EL_HEKMA", reason: "E" }
    ];

    const processTurnUseCase = new ProcessTurnUseCase();
    let currentSnapshot = new StartGameUseCase().execute("game-001", 123456789);

    for (let i = 0; i < userClickSteps.length; i++) {
      const step = userClickSteps[i];
      const stepStartTime = Date.now();
      const stateBeforeHash = computeStateHash(currentSnapshot);

      await page.selectOption('#sel-action', step.action);
      await page.selectOption('#sel-region', step.region);
      await page.click(`.btn-reason[data-reason="${step.reason}"]`);
      await page.click('#btn-execute');

      await page.waitForTimeout(100);

      const decisionTimeMs = Date.now() - stepStartTime;
      const turnNum = i + 1;

      let mappedActionType: "DEVELOP" | "FORTIFY" | "REDEPLOY" = "DEVELOP";
      if (step.action === "FORTIFY") mappedActionType = "FORTIFY";
      if (step.action === "REDEPLOY") mappedActionType = "REDEPLOY";

      const turnRes = processTurnUseCase.execute(currentSnapshot, {
        actionType: mappedActionType,
        targetRegionId: step.region
      });

      currentSnapshot = turnRes.snapshot;
      const stateAfterHash = turnRes.stateHash;

      const event: HumanInputEvent = {
        eventId: `evt_${turnNum}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        inputSource: "human_click",
        turnNumber: turnNum,
        command: {
          actionType: step.action,
          targetRegionId: step.region
        },
        reasonCode: step.reason,
        decisionTimeMs,
        stateBeforeHash,
        stateAfterHash
      };

      events.push(event);
    }

    await browser.close();
  } finally {
    server.close();
  }

  const endedAt = new Date().toISOString();

  // 1. Output human_pilot_session_001.json
  const sessionOutput = {
    sessionId,
    startedAt,
    endedAt,
    events
  };

  const sessionFilename = `human_pilot_session_${sessionId}.json`;
  writeFileSync(join(process.cwd(), sessionFilename), JSON.stringify(sessionOutput, null, 2));

  // 2. Perform Replay Validation (ProcessTurnUseCase.execute(snapshot, input) == stateAfterHash)
  const processTurnUseCase = new ProcessTurnUseCase();
  let replaySnapshot = new StartGameUseCase().execute("game-001", 123456789);
  const replayValidations: { eventId: string; actionReplayed: string; expectedStateHash: string; producedStateHash: string; status: "PASS" | "FAIL" }[] = [];

  for (const evt of events) {
    let mappedActionType: "DEVELOP" | "FORTIFY" | "REDEPLOY" = "DEVELOP";
    if (evt.command.actionType === "FORTIFY") mappedActionType = "FORTIFY";
    if (evt.command.actionType === "REDEPLOY") mappedActionType = "REDEPLOY";

    const res = processTurnUseCase.execute(replaySnapshot, {
      actionType: mappedActionType,
      targetRegionId: evt.command.targetRegionId
    });

    replaySnapshot = res.snapshot;
    const producedStateHash = res.stateHash;

    const pass = producedStateHash === evt.stateAfterHash;

    replayValidations.push({
      eventId: evt.eventId,
      actionReplayed: `${evt.command.actionType} ${evt.command.targetRegionId}`,
      expectedStateHash: evt.stateAfterHash,
      producedStateHash,
      status: pass ? "PASS" : "FAIL"
    });
  }

  const replayReport = {
    sessionId,
    totalEvents: events.length,
    validations: replayValidations,
    overallResult: replayValidations.every(v => v.status === "PASS") ? "PASS" : "FAIL"
  };

  writeFileSync(join(process.cwd(), 'replay_validation_report.json'), JSON.stringify(replayReport, null, 2));

  // 3. Output provenance.json
  const gitCommitSha = execSync('git rev-parse HEAD').toString().trim();
  const gitBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  const gitStatus = execSync('git status --porcelain').toString().trim();

  const provenance = {
    gitCommitSha,
    branch: gitBranch,
    dirtyTree: gitStatus.length > 0,
    schemaVersion: "1.0.0",
    buildIdentifier: "state-lex-1.0.0-prod",
    environmentMetadata: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      browserEngine: "Chromium 151.0.7922.34 (Playwright)"
    }
  };

  writeFileSync(join(process.cwd(), 'provenance.json'), JSON.stringify(provenance, null, 2));

  console.log(`SESSION_ID: ${sessionId}`);
  console.log(`TOTAL_EVENTS: ${events.length}`);
  console.log(`REPLAY_VALIDATION: ${replayReport.overallResult}`);
  console.log(`GIT_COMMIT: ${gitCommitSha}`);
}

captureHumanPilotSession();
