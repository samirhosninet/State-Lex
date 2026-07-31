import { describe, it, expect } from 'vitest';
import { DatasetLoader } from '../../infrastructure/config/DatasetLoader';
import { GSTTurnEngine } from '../../domain/services/TurnEngine';
import { DeterministicMath } from '../../domain/services/DeterministicMath';

describe('TurnEngine Lifecycle & Deterministic Math (Phase 2)', () => {
  it('applies post-formula rounding and post-sum clamp correctly', () => {
    expect(DeterministicMath.roundPostFormula(12.3456)).toBe(12.35);
    expect(DeterministicMath.clampTrustScore(105)).toBe(100);
    expect(DeterministicMath.clampTrustScore(-10)).toBe(0);
  });

  it('executes turn lifecycle step-by-step and maintains vector sum invariant equal to 100', () => {
    const loader = new DatasetLoader();
    const engine = new GSTTurnEngine(loader.loadBalanceConfig(), loader.loadInfluenceMatrix());

    const res1 = engine.executeTurn({ sourceIndex: 0, targetIndex: 1, amount: 5 });

    expect(res1.turnNumber).toBe(1);
    expect(res1.allocationAfter).toEqual([15, 25, 20, 20, 20]);
    expect(res1.worldChanges.length).toBe(0);
    expect(res1.consequences.length).toBe(0);
  });

  it('triggers Turn 11 Rule Mutation at step 6 non-retroactively', () => {
    const loader = new DatasetLoader();
    const engine = new GSTTurnEngine(loader.loadBalanceConfig(), loader.loadInfluenceMatrix());

    for (let turn = 1; turn <= 10; turn++) {
      engine.executeTurn({ sourceIndex: turn % 5, targetIndex: (turn + 1) % 5, amount: 5 });
    }

    const res11 = engine.executeTurn({ sourceIndex: 0, targetIndex: 1, amount: 5 });
    expect(res11.turnNumber).toBe(11);
    expect(res11.worldChanges.length).toBe(1);
    expect(res11.worldChanges[0].turn).toBe(11);
    expect(res11.worldChanges[0].edgeChanged).toEqual([0, 1]);
    expect(res11.worldChanges[0].previousWeight).toBe(0.2);
    expect(res11.worldChanges[0].newWeight).toBe(0.5);
  });
});
