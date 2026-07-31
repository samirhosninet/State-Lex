import { describe, it, expect } from 'vitest';
import { PRNGService } from '../../domain/services/PRNGService';
import { TurnSeed } from '../../domain/values/TurnSeed';

describe('PRNGService Unit Tests (ADR-002)', () => {
  it('same seed produces byte-for-byte identical 20-value sequence across independent instances', () => {
    const seed = new TurnSeed(123456789);
    const instanceA = new PRNGService(seed);
    const instanceB = new PRNGService(seed);

    const sequenceA: number[] = [];
    const sequenceB: number[] = [];

    for (let i = 0; i < 20; i++) {
      sequenceA.push(instanceA.next());
      sequenceB.push(instanceB.next());
    }

    expect(sequenceA).toEqual(sequenceB);
  });

  it('different seeds produce completely different pseudo-random sequences', () => {
    const seedA = new TurnSeed(123456789);
    const seedB = new TurnSeed(987654321);

    const prngA = new PRNGService(seedA);
    const prngB = new PRNGService(seedB);

    const sequenceA: number[] = [];
    const sequenceB: number[] = [];

    for (let i = 0; i < 20; i++) {
      sequenceA.push(prngA.next());
      sequenceB.push(prngB.next());
    }

    expect(sequenceA).not.toEqual(sequenceB);
  });

  it('nextInt generates integers strictly within requested bounds', () => {
    const seed = new TurnSeed(42);
    const prng = new PRNGService(seed);

    for (let i = 0; i < 100; i++) {
      const val = prng.nextInt(1, 10);
      expect(Number.isInteger(val)).toBe(true);
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(10);
    }
  });
});
