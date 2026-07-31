import { describe, it, expect } from 'vitest';
import { GoldenTraceRunner } from './GoldenTraceRunner';
import { DecisionDiversityCalculator } from '../../application/services/DecisionDiversityCalculator';

describe('Scenario GST-01: 20-Turn Golden Trace Verification', () => {
  it('executes 20-turn trace matching golden_trace_TASK015-GOLDEN-001.json bit-for-bit', () => {
    const goldenDataset = GoldenTraceRunner.loadGoldenTrace();
    expect(goldenDataset.total_turns).toBe(20);

    const moves = [];
    for (let i = 0; i < 20; i++) {
      moves.push({
        sourceIndex: i % 5,
        targetIndex: (i + 1) % 5,
        amount: 5
      });
    }

    const actualRecords = GoldenTraceRunner.run20TurnSimulation(moves);
    expect(actualRecords.length).toBe(20);

    for (let i = 0; i < 20; i++) {
      const actual = actualRecords[i];
      const expected = goldenDataset.records[i];

      expect(actual.turn_number).toBe(expected.turn_number);
      expect(actual.allocation_after).toEqual(expected.allocation_after);
      expect(actual.trust_states_after).toEqual(expected.trust_states_after);
      expect(actual.rule_mutation_triggered).toBe(expected.rule_mutation_triggered);

      // Verify Vector Sum Invariant = 100
      const vec = actual.allocation_after;
      const sum = vec.stateAdministration + vec.investors + vec.securityEstablishment + vec.localCommunities + vec.media;
      expect(sum).toBe(100);
    }

    // Verify Decision Diversity Metric <= 0.60
    const divRes = DecisionDiversityCalculator.compute(actualRecords);
    expect(divRes.status).toBe('PASS');
    expect(divRes.dominanceRatio).toBeLessThanOrEqual(0.60);
  });
});
