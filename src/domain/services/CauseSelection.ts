import { ExplanationConfigData } from './ExplanationConfigTypes';

export interface CausalContributor {
  actor_index: number;
  cause_type_index: number;
  cause_type: string;
  impact: number;
}

export class CauseSelection {
  /**
   * Sorts causal contributors dynamically according to the injected tie_break criteria.
   * Injected config is treated as trusted input from DatasetLoader.
   */
  public static selectDominantCauses(
    contributors: ReadonlyArray<CausalContributor>,
    config: ExplanationConfigData
  ): CausalContributor[] {
    if (!config) {
      throw new Error("Missing cause selection configuration.");
    }

    if (!Array.isArray(config.tie_break)) {
      throw new Error("Missing cause selection configuration: tie_break array is required.");
    }

    const sorted = [...contributors];

    sorted.sort((a, b) => {
      for (const criterion of config.tie_break) {
        let diff = 0;

        if (criterion === "magnitude") {
          diff = Math.abs(b.impact) - Math.abs(a.impact);
        } else if (criterion === "actor_index") {
          diff = a.actor_index - b.actor_index;
        } else if (criterion === "cause_type_index") {
          diff = a.cause_type_index - b.cause_type_index;
        }

        if (diff !== 0) {
          return diff;
        }
      }
      return 0;
    });

    return sorted;
  }
}
