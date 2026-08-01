import { describe, it, expect } from 'vitest';
import { GoldenTraceRunner } from './GoldenTraceRunner';

describe('Scenario GST-03a: Neglect Consequence Validation (Fresh S0 State Origin)', () => {
  it('validates neglect consequence triggering and idempotency under FRESH_S0 state', () => {
    const goldenTraceS0 = GoldenTraceRunner.loadGST03_S0Trace();

    // Verify Provenance Metadata
    expect(goldenTraceS0.scenario_id).toBe('GST-03a');
    expect(goldenTraceS0.state_origin).toBe('FRESH_S0');
    expect(goldenTraceS0.mutation_source).toBe('NONE');
    expect(goldenTraceS0.replay_turns).toBe(false);

    const movesS0 = [
      { sourceIndex: 4, targetIndex: 0, amount: 20 },
      { sourceIndex: 1, targetIndex: 2, amount: 5 },
      { sourceIndex: 2, targetIndex: 3, amount: 5 },
      { sourceIndex: 3, targetIndex: 0, amount: 5 }
    ];

    const actualRecords = GoldenTraceRunner.runGST03_S0(movesS0);
    expect(actualRecords.length).toBe(4);

    // Turn 1, Turn 2: zero consequence
    expect(actualRecords[0].consequences.length).toBe(0);
    expect(actualRecords[1].consequences.length).toBe(0);

    // Turn 3: Neglect consequence fires for LocalCommunities
    expect(actualRecords[2].consequences.length).toBe(1);
    expect(actualRecords[2].consequences[0].actor).toBe('LocalCommunities');

    // Turn 4: Idempotency enforced (0 additional consequence)
    expect(actualRecords[3].consequences.length).toBe(0);

    // Deep equality match against golden trace artifact
    expect(actualRecords).toEqual(goldenTraceS0.records);
  });
});
