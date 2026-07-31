import { TurnTelemetryRecord } from './TelemetryExporter';

export interface DecisionDiversityResult {
  totalDecisionUnits: number;
  uniquePatternsCount: number;
  mostCommonPatternFrequency: number;
  dominanceRatio: number;
  status: "PASS" | "FAIL";
}

export class DecisionDiversityCalculator {
  public static compute(records: TurnTelemetryRecord[]): DecisionDiversityResult {
    if (records.length === 0) {
      return {
        totalDecisionUnits: 0,
        uniquePatternsCount: 0,
        mostCommonPatternFrequency: 0,
        dominanceRatio: 0,
        status: "PASS"
      };
    }

    const frequencyMap = new Map<string, number>();

    for (const rec of records) {
      const vec = rec.allocation_after;
      const patternKey = `(${vec.stateAdministration},${vec.investors},${vec.securityEstablishment},${vec.localCommunities},${vec.media})`;
      frequencyMap.set(patternKey, (frequencyMap.get(patternKey) || 0) + 1);
    }

    let maxFreq = 0;
    for (const freq of frequencyMap.values()) {
      if (freq > maxFreq) {
        maxFreq = freq;
      }
    }

    const total = records.length;
    const dominanceRatio = Math.round((maxFreq / total) * 100) / 100;
    const status = dominanceRatio <= 0.60 ? "PASS" : "FAIL";

    return {
      totalDecisionUnits: total,
      uniquePatternsCount: frequencyMap.size,
      mostCommonPatternFrequency: maxFreq,
      dominanceRatio,
      status
    };
  }
}
