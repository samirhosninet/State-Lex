export interface ExplanationClassificationRule {
  id: string;
  requires: {
    top_cause_source: string;
    cause_type: string;
    dominance_ratio: string;
    minimum_impact: number;
  };
  intensity_rules: Record<string, string>;
}

export interface ExplanationConfigData {
  tie_break: string[];
  classification_rules: ExplanationClassificationRule[];
}
