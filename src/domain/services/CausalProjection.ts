import { CausalContributor } from './CauseSelection';
import { ExplanationConfigData, ExplanationClassificationRule } from './ExplanationConfigTypes';

export interface ProjectionOutput {
  category: string;
  intensity: string;
}

export class CausalProjection {
  private static readonly DEFAULT_FALLBACK: ProjectionOutput = {
    category: "unclassified",
    intensity: "none"
  };

  /**
   * Evaluates dominant causes against injected explanation config rules.
   * Pure deterministic function: zero side-effects, zero mutation of input array.
   */
  public static project(
    dominantCauses: ReadonlyArray<CausalContributor>,
    config: ExplanationConfigData
  ): ProjectionOutput {
    if (!config) {
      throw new Error("Missing explanation configuration.");
    }

    if (!Array.isArray(config.classification_rules)) {
      throw new Error("Missing explanation configuration: classification_rules array is required.");
    }

    if (!dominantCauses || dominantCauses.length === 0) {
      return { ...CausalProjection.DEFAULT_FALLBACK };
    }

    const topCause = dominantCauses[0];
    const topImpactAbs = Math.abs(topCause.impact);

    let totalImpactAbs = 0;
    for (let i = 0; i < dominantCauses.length; i++) {
      totalImpactAbs += Math.abs(dominantCauses[i].impact);
    }

    const dominanceRatio = totalImpactAbs > 0 ? topImpactAbs / totalImpactAbs : 0;

    for (const rule of config.classification_rules) {
      if (CausalProjection.matchesRule(topCause, topImpactAbs, dominanceRatio, rule)) {
        const category = rule.id;
        const intensity = CausalProjection.determineIntensity(topImpactAbs, rule.intensity_rules);
        return { category, intensity };
      }
    }

    return { ...CausalProjection.DEFAULT_FALLBACK };
  }

  private static matchesRule(
    topCause: CausalContributor,
    topImpactAbs: number,
    dominanceRatio: number,
    rule: ExplanationClassificationRule
  ): boolean {
    const req = rule.requires;

    if (req.top_cause_source !== "dominant_causes[0]") {
      return false;
    }

    if (req.cause_type && topCause.cause_type !== req.cause_type) {
      return false;
    }

    if (typeof req.minimum_impact === 'number' && topImpactAbs < req.minimum_impact) {
      return false;
    }

    if (req.dominance_ratio) {
      if (!CausalProjection.evaluatePredicate(dominanceRatio, req.dominance_ratio)) {
        return false;
      }
    }

    return true;
  }

  private static determineIntensity(
    impactAbs: number,
    intensityRules: Record<string, string>
  ): string {
    if (!intensityRules) {
      return "low";
    }

    const keys = Object.keys(intensityRules);
    if (keys.length === 0) {
      return "low";
    }

    // Sort intensity rules by numeric threshold descending to evaluate highest intensity first
    const sortedEntries = keys
      .map(key => {
        const predStr = intensityRules[key];
        const numVal = parseFloat(predStr.replace(/[^0-9.]/g, ''));
        return { key, predStr, numVal: isNaN(numVal) ? 0 : numVal };
      })
      .sort((a, b) => b.numVal - a.numVal);

    for (const entry of sortedEntries) {
      if (CausalProjection.evaluatePredicate(impactAbs, entry.predStr)) {
        return entry.key;
      }
    }

    return "low";
  }

  private static evaluatePredicate(value: number, predicate: string): boolean {
    const match = predicate.match(/^(>=|<=|>|<|==)?\s*([0-9.]+)/);
    if (!match) {
      return false;
    }

    const op = match[1] || '==';
    const target = parseFloat(match[2]);

    if (isNaN(target)) {
      return false;
    }

    switch (op) {
      case '>=':
        return value >= target;
      case '<=':
        return value <= target;
      case '>':
        return value > target;
      case '<':
        return value < target;
      case '==':
        return value === target;
      default:
        return false;
    }
  }
}
