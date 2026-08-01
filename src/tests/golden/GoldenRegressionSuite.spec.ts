import { describe, it, expect } from 'vitest';
import { GoldenTraceRunner } from './GoldenTraceRunner';
import { DecisionDiversityCalculator } from '../../application/services/DecisionDiversityCalculator';

describe('Golden Simulation Master Regression Suite', () => {
  it('passes GST-01 20-turn golden trace assertions and metrics', () => {
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

  it('passes GST-03a (Fresh S0 State Origin) neglect consequence trace match', () => {
    const traceS0 = GoldenTraceRunner.loadGST03_S0Trace();
    const movesS0 = [
      { sourceIndex: 4, targetIndex: 0, amount: 20 },
      { sourceIndex: 1, targetIndex: 2, amount: 5 },
      { sourceIndex: 2, targetIndex: 3, amount: 5 },
      { sourceIndex: 3, targetIndex: 0, amount: 5 }
    ];

    const actualS0 = GoldenTraceRunner.runGST03_S0(movesS0);
    expect(actualS0).toEqual(traceS0.records);
  });

  it('passes GST-03b (Post-Mutation S1 State Origin) neglect consequence trace match', () => {
    const traceS1 = GoldenTraceRunner.loadGST03_S1Trace();
    const movesS1 = [
      { sourceIndex: 4, targetIndex: 0, amount: 20 },
      { sourceIndex: 1, targetIndex: 2, amount: 5 },
      { sourceIndex: 2, targetIndex: 3, amount: 5 },
      { sourceIndex: 3, targetIndex: 0, amount: 5 }
    ];

    const actualS1 = GoldenTraceRunner.runGST03_S1(movesS1);
    expect(actualS1).toEqual(traceS1.records);
  });
});
