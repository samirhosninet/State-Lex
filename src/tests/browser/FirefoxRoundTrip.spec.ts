import { describe, it, expect } from 'vitest';
import { runFirefoxVerification } from './firefox-roundtrip.runner';

describe('TASK-009B Browser Round-Trip Identity Verification (Firefox)', () => {
  it('executes Round-Trip Identity test inside headless Firefox browser engine and verifies byte-for-byte stateHash equality', async () => {
    await expect(runFirefoxVerification()).resolves.not.toThrow();
  }, 30000);
});
