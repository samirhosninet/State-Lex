import { describe, it, expect } from 'vitest';
import { CauseSelection, CausalContributor } from '../../domain/services/CauseSelection';
import { ExplanationConfigData } from '../../domain/services/ExplanationConfigTypes';

describe('CauseSelection Layer (Phase 2)', () => {
  const defaultConfig: ExplanationConfigData = {
    tie_break: ["magnitude", "actor_index", "cause_type_index"],
    classification_rules: []
  };

  it('TEST 1: Deterministic ordering (identical inputs produce identical dominant_causes)', () => {
    const contributors: CausalContributor[] = [
      { actor_index: 2, cause_type_index: 1, cause_type: 'security', impact: -3 },
      { actor_index: 4, cause_type_index: 0, cause_type: 'media', impact: -5 },
      { actor_index: 1, cause_type_index: 2, cause_type: 'investors', impact: -5 }
    ];

    const run1 = CauseSelection.selectDominantCauses(contributors, defaultConfig);
    const run2 = CauseSelection.selectDominantCauses(contributors, defaultConfig);

    expect(run1).toEqual(run2);
    expect(run1[0].cause_type).toBe('investors'); // actor_index 1 wins tie-break over actor_index 4
  });

  it('TEST 2: Magnitude priority (higher absolute impact wins)', () => {
    const contributors: CausalContributor[] = [
      { actor_index: 0, cause_type_index: 0, cause_type: 'government', impact: -3 },
      { actor_index: 4, cause_type_index: 0, cause_type: 'media', impact: -5 }
    ];

    const result = CauseSelection.selectDominantCauses(contributors, defaultConfig);
    expect(result[0].cause_type).toBe('media');
    expect(result[0].impact).toBe(-5);
  });

  it('TEST 3: Actor index tie break (same magnitude -> lower actor_index wins)', () => {
    const contributors: CausalContributor[] = [
      { actor_index: 4, cause_type_index: 0, cause_type: 'media', impact: -5 },
      { actor_index: 1, cause_type_index: 0, cause_type: 'investors', impact: -5 }
    ];

    const result = CauseSelection.selectDominantCauses(contributors, defaultConfig);
    expect(result[0].actor_index).toBe(1);
    expect(result[0].cause_type).toBe('investors');
  });

  it('TEST 4: Cause type index tie break (same magnitude & actor_index -> lower cause_type_index wins)', () => {
    const contributors: CausalContributor[] = [
      { actor_index: 2, cause_type_index: 3, cause_type: 'defense', impact: -4 },
      { actor_index: 2, cause_type_index: 1, cause_type: 'security', impact: -4 }
    ];

    const result = CauseSelection.selectDominantCauses(contributors, defaultConfig);
    expect(result[0].cause_type_index).toBe(1);
    expect(result[0].cause_type).toBe('security');
  });

  it('TEST 5: Dataset-driven ordering (custom tie_break order alters sort behavior without code modification)', () => {
    const customConfig: ExplanationConfigData = {
      tie_break: ["actor_index", "magnitude", "cause_type_index"],
      classification_rules: []
    };

    const contributors: CausalContributor[] = [
      { actor_index: 4, cause_type_index: 0, cause_type: 'media', impact: -10 },
      { actor_index: 1, cause_type_index: 0, cause_type: 'investors', impact: -2 }
    ];

    // Under default config (magnitude first), media (-10) wins
    const defaultResult = CauseSelection.selectDominantCauses(contributors, defaultConfig);
    expect(defaultResult[0].cause_type).toBe('media');

    // Under custom config (actor_index first), investors (actor 1) wins over media (actor 4)
    const customResult = CauseSelection.selectDominantCauses(contributors, customConfig);
    expect(customResult[0].cause_type).toBe('investors');
  });

  it('TEST 6: Zero schema whitelist validation inside CauseSelection', () => {
    // CauseSelection treats injected config as trusted input from DatasetLoader
    const customConfig: ExplanationConfigData = {
      tie_break: ["actor_index"],
      classification_rules: []
    };

    const contributors: CausalContributor[] = [
      { actor_index: 3, cause_type_index: 0, cause_type: 'communities', impact: -1 },
      { actor_index: 0, cause_type_index: 0, cause_type: 'government', impact: -1 }
    ];

    expect(() => CauseSelection.selectDominantCauses(contributors, customConfig)).not.toThrow();
    const result = CauseSelection.selectDominantCauses(contributors, customConfig);
    expect(result[0].actor_index).toBe(0);
  });
});
