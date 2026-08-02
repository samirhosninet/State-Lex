import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { GSTTurnEngine, GSTAllocationMoveInput } from '../../domain/services/TurnEngine';
import { DatasetLoader } from '../../infrastructure/config/DatasetLoader';

export function runGoldenCampaign(): Record<string, unknown>[] {
  const loader = new DatasetLoader();
  const engine = new GSTTurnEngine(loader.loadBalanceConfig(), loader.loadInfluenceMatrix());

  const campaignRecords: Record<string, unknown>[] = [];

  for (let turn = 1; turn <= 100; turn++) {
    const src = (turn % 5);
    const tgt = ((turn + 2) % 5);
    const amt = (turn % 4) + 1; // 1, 2, 3, or 4

    const move: GSTAllocationMoveInput = {
      sourceIndex: src,
      targetIndex: tgt,
      amount: amt
    };

    const res = engine.executeTurn(move);

    campaignRecords.push({
      turnNumber: res.turnNumber,
      allocationBefore: res.allocationBefore,
      allocationAfter: res.allocationAfter,
      trustStatesBefore: res.trustStatesBefore,
      trustStatesAfter: res.trustStatesAfter,
      internalScoresAfter: res.internalScoresAfter,
      worldChanges: res.worldChanges,
      consequences: res.consequences
    });
  }

  return campaignRecords;
}

describe('AC-6 — Golden Campaign Regression Suite', () => {
  it('generates/verifies 100-turn golden campaign records', () => {
    const tmpDir = process.platform === 'win32' ? join(process.env.TEMP || 'C:\\tmp', 'bugfix003') : '/tmp/bugfix003';
    mkdirSync(tmpDir, { recursive: true });

    const beforeFile = join(tmpDir, 'golden_campaign_before.json');
    const afterFile = join(tmpDir, 'golden_campaign_after.json');
    const cmpFile = join(tmpDir, 'comparison.txt');

    const records = runGoldenCampaign();

    if (!existsSync(beforeFile)) {
      writeFileSync(beforeFile, JSON.stringify(records, null, 2));
      console.log(`Pre-fix Golden Campaign baseline generated at: ${beforeFile}`);
    } else {
      writeFileSync(afterFile, JSON.stringify(records, null, 2));
      console.log(`Post-fix Golden Campaign artifact generated at: ${afterFile}`);

      const beforeStr = readFileSync(beforeFile, 'utf-8');
      const afterStr = readFileSync(afterFile, 'utf-8');

      const beforeHash = createHash('sha256').update(beforeStr).digest('hex');
      const afterHash = createHash('sha256').update(afterStr).digest('hex');

      const match = beforeStr === afterStr;
      const cmpOutput = `BEFORE HASH: ${beforeHash}\nAFTER HASH:  ${afterHash}\nMATCH: ${match ? 'PASS' : 'FAIL'}`;
      writeFileSync(cmpFile, cmpOutput);

      expect(afterStr, 'Golden Campaign post-fix output must match pre-fix baseline bit-for-bit').toBe(beforeStr);
    }
  });
});
