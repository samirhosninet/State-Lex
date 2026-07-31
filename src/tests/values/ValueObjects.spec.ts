import { describe, it, expect } from 'vitest';
import { RegionId } from '../../domain/values/RegionId';
import { FactionId } from '../../domain/values/FactionId';
import { TurnSeed } from '../../domain/values/TurnSeed';
import { TurnNumber } from '../../domain/values/TurnNumber';
import { FixedPointResourcePool } from '../../domain/values/FixedPointResourcePool';

describe('Value Objects Unit Tests', () => {
  it('RegionId validates valid region identifiers and rejects invalid strings', () => {
    const region1 = new RegionId('EL_ALAMEIN');
    const region2 = new RegionId('RAS_EL_HEKMA');
    expect(region1.value).toBe('EL_ALAMEIN');
    expect(region2.value).toBe('RAS_EL_HEKMA');
    expect(() => new RegionId('INVALID_REGION')).toThrow();
  });

  it('FactionId validates valid faction identifiers and rejects invalid strings', () => {
    const faction1 = new FactionId('FACTION_ALPHA');
    const faction2 = new FactionId('FACTION_BETA');
    expect(faction1.value).toBe('FACTION_ALPHA');
    expect(faction2.value).toBe('FACTION_BETA');
    expect(() => new FactionId('FACTION_GAMMA')).toThrow();
  });

  it('TurnSeed enforces 32-bit unsigned integer range', () => {
    const seed = new TurnSeed(0xDEADBEEF);
    expect(seed.value).toBe(3735928559);
    expect(() => new TurnSeed(-1)).toThrow();
    expect(() => new TurnSeed(4294967296)).toThrow();
    expect(() => new TurnSeed(1.5)).toThrow();
  });

  it('TurnNumber enforces strictly positive integer >= 1', () => {
    const turn = new TurnNumber(1);
    expect(turn.value).toBe(1);
    expect(turn.next().value).toBe(2);
    expect(() => new TurnNumber(0)).toThrow();
    expect(() => new TurnNumber(-5)).toThrow();
  });

  it('FixedPointResourcePool performs exact BigInt math without floating point drift', () => {
    const pool1 = FixedPointResourcePool.fromUnits(100); // 10000n base units
    const pool2 = FixedPointResourcePool.fromUnits(50);  // 5000n base units
    const added = pool1.add(pool2);
    expect(added.baseUnits).toBe(15000n);
    expect(added.toUnits()).toBe(150);

    const subtracted = pool1.subtract(pool2);
    expect(subtracted.baseUnits).toBe(5000n);
    expect(subtracted.toUnits()).toBe(50);

    expect(() => pool2.subtract(pool1)).toThrow(/Insufficient resources/);
    expect(() => new FixedPointResourcePool(-1n)).toThrow();
  });
});
