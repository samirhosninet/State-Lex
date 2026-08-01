import { describe, it, expect } from 'vitest';
import { GoldenTraceRunner } from './GoldenTraceRunner';

describe('Scenario GST-03b: Neglect Consequence Validation (Post-Mutation S1 State Origin)', () => {
  it('validates neglect consequence triggering and idempotency under POST_MUTATION_S1 state', () => {
    const goldenTraceS1 = GoldenTraceRunner.loadGST03_S1Trace();

    // Verify Provenance Metadata
    expect(goldenTraceS1.scenario_id).toBe('GST-03b');
    expect(goldenTraceS1.state_origin).toBe('POST_MUTATION_S1');
    expect(goldenTraceS1.mutation_source).toBe('GST-02');
    expect(goldenTraceS1.replay_turns).toBe(false);

    const movesS1 = [
      { sourceIndex: 4, targetIndex: 0, amount: 20 },
      { sourceIndex: 1, targetIndex: 2, amount: 5 },
      { sourceIndex: 2, targetIndex: 3, amount: 5 },
      { sourceIndex: 3, targetIndex: 0, amount: 5 }
    ];

    const actualRecords = GoldenTraceRunner.runGST03_S1(movesS1);
    expect(actualRecords.length).toBe(4);

    // Turn 1, Turn 2: zero consequence
    expect(actualRecords[0].consequences.length).toBe(0);
    expect(actualRecords[1].consequences.length).toBe(0);

    // Turn 3: Neglect consequence fires under post-mutation state
    expect(actualRecords[2].consequences.length).toBe(1);

    // Turn 4: Idempotency enforced (0 additional consequence)
    expect(actualRecords[3].consequences.length).toBe(0);

    // Deep equality match against golden trace artifact
    expect(actualRecords).toEqual(goldenTraceS1.records);
  });
});
