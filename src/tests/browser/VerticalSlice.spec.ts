import { describe, it, expect } from 'vitest';
import { runVerticalSliceE2E } from './vertical-slice.runner';

describe('TASK-013 Vertical Slice 0.1 E2E Playable Loop', () => {
  it('allows human player to complete full lifecycle: New Game -> Issue Commands -> Execute Turn -> Save -> Close -> Load -> Continue', async () => {
    const log = await runVerticalSliceE2E();
    expect(log).toContain('Step 1: Open Application');
    expect(log).toContain('Step 2: New Game Initialized at Turn 1');
    expect(log).toContain('Step 4: Save Game State to IndexedDB');
    expect(log).toContain('Step 6: Load Saved Game State');
    expect(log).toContain('State: Continued Playing to Turn 3');
  }, 30000);
});
