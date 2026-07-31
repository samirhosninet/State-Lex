export class DeterministicMath {
  /**
   * Applies post-formula rounding to a calculated raw delta value.
   * Rounding is applied strictly AFTER full 5-actor summation, never mid-formula.
   */
  public static roundPostFormula(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Clamps internal trust score within [0, 100].
   * Clamping is applied once per actor per turn after raw_delta is fully summed.
   */
  public static clampTrustScore(score: number): number {
    if (score < 0) return 0;
    if (score > 100) return 100;
    return Math.round(score * 100) / 100;
  }
}
