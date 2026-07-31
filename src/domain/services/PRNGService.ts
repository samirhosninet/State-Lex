import { TurnSeed } from '../values/TurnSeed';

export class PRNGService {
  private _state: number;

  constructor(seed: TurnSeed) {
    this._state = seed.value;
  }

  /**
   * Generates the next pseudo-random floating-point number in the range [0, 1).
   * Consumes pure 32-bit Mulberry32 PRNG state transition.
   */
  public next(): number {
    let t = (this._state += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates a pseudo-random integer between min (inclusive) and max (inclusive).
   */
  public nextInt(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
      throw new Error(`Invalid int bounds: min=${min}, max=${max}`);
    }
    const range = max - min + 1;
    return min + Math.floor(this.next() * range);
  }
}
