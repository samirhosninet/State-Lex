import { describe, it, expect } from 'vitest';
import { GoldenTraceRunner } from './GoldenTraceRunner';
import { DecisionDiversityCalculator } from '../../application/services/DecisionDiversityCalculator';

describe('Golden Simulation Master Regression Suite', () => {
  it('passes all 20-turn golden trace assertions and metrics', () => {
    const goldenDataset = GoldenTraceRunner.loadGoldenTrace();
    expect(goldenDataset.records.length).toBe(20);

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

    const divResult = DecisionDiversityCalculator.compute(actualRecords);
    expect(divResult.status).toBe('PASS');
    expect(divResult.dominanceRatio).toBeLessThanOrEqual(0.60);
  });
});
