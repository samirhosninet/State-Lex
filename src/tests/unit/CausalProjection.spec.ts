import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { CausalProjection } from '../../domain/services/CausalProjection';
import { CausalContributor } from '../../domain/services/CauseSelection';
import { ExplanationConfigData } from '../../domain/services/ExplanationConfigTypes';

describe('CausalProjection Layer (Phase 3)', () => {
  const defaultConfig: ExplanationConfigData = {
    tie_break: ["magnitude", "actor_index", "cause_type_index"],
    classification_rules: [
      {
        id: "media_pressure_dominant",
        requires: {
          top_cause_source: "dominant_causes[0]",
          cause_type: "media",
          dominance_ratio: ">=0.50",
          minimum_impact: 3
        },
        intensity_rules: {
          moderate: ">=5",
          severe: ">=10"
        }
      }
    ]
  };

  it('TEST 1: Correct category selected from matching rule', () => {
    const causes: CausalContributor[] = [
      { actor_index: 4, cause_type_index: 0, cause_type: 'media', impact: -6 }
    ];

    const result = CausalProjection.project(causes, defaultConfig);
    expect(result.category).toBe('media_pressure_dominant');
  });

  it('TEST 2: Correct intensity selected based on configured predicate thresholds', () => {
    const causesModerate: CausalContributor[] = [
      { actor_index: 4, cause_type_index: 0, cause_type: 'media', impact: -6 }
    ];
    const resultMod = CausalProjection.project(causesModerate, defaultConfig);
    expect(resultMod.intensity).toBe('moderate');

    const causesSevere: CausalContributor[] = [
      { actor_index: 4, cause_type_index: 0, cause_type: 'media', impact: -12 }
    ];
    const resultSev = CausalProjection.project(causesSevere, defaultConfig);
    expect(resultSev.intensity).toBe('severe');
  });

  it('TEST 3: No matching rule returns expected fallback ({ category: "unclassified", intensity: "none" })', () => {
    const causesNonMatching: CausalContributor[] = [
      { actor_index: 1, cause_type_index: 0, cause_type: 'investors', impact: -2 }
    ];

    const result = CausalProjection.project(causesNonMatching, defaultConfig);
    expect(result).toEqual({
      category: "unclassified",
      intensity: "none"
    });
  });

  it('TEST 4: Changing configuration changes output WITHOUT changing code', () => {
    const customConfig: ExplanationConfigData = {
      tie_break: ["magnitude"],
      classification_rules: [
        {
          id: "investor_panic_custom",
          requires: {
            top_cause_source: "dominant_causes[0]",
            cause_type: "investors",
            dominance_ratio: ">=0.40",
            minimum_impact: 2
          },
          intensity_rules: {
            extreme: ">=2"
          }
        }
      ]
    };

    const causes: CausalContributor[] = [
      { actor_index: 1, cause_type_index: 0, cause_type: 'investors', impact: -4 }
    ];

    const defaultResult = CausalProjection.project(causes, defaultConfig);
    expect(defaultResult.category).toBe('unclassified');

    const customResult = CausalProjection.project(causes, customConfig);
    expect(customResult.category).toBe('investor_panic_custom');
    expect(customResult.intensity).toBe('extreme');
  });

  it('TEST 5: Repeated execution with same input and config produces identical output (Deterministic)', () => {
    const causes: CausalContributor[] = [
      { actor_index: 4, cause_type_index: 0, cause_type: 'media', impact: -8 }
    ];

    const run1 = CausalProjection.project(causes, defaultConfig);
    const run2 = CausalProjection.project(causes, defaultConfig);
    const run3 = CausalProjection.project(causes, defaultConfig);

    expect(run1).toEqual(run2);
    expect(run2).toEqual(run3);
  });

  it('TEST 6: Zero JSON imports inside CausalProjection.ts file', () => {
    const fileContent = readFileSync(join(process.cwd(), 'src', 'domain', 'services', 'CausalProjection.ts'), 'utf-8');
    expect(fileContent).not.toMatch(/\.json/);
    expect(fileContent).not.toMatch(/readFileSync/);
  });

  it('TEST 7: Projection never reorders or mutates dominantCauses input array', () => {
    const causes: CausalContributor[] = [
      { actor_index: 4, cause_type_index: 0, cause_type: 'media', impact: -8 },
      { actor_index: 1, cause_type_index: 0, cause_type: 'investors', impact: -2 }
    ];

    const causesCopy = JSON.parse(JSON.stringify(causes));

    CausalProjection.project(causes, defaultConfig);

    expect(causes).toEqual(causesCopy);
  });

  it('TEST 8: Projection never recalculates magnitude (consumes existing values only)', () => {
    const causes: CausalContributor[] = [
      { actor_index: 4, cause_type_index: 0, cause_type: 'media', impact: -12 }
    ];

    const result = CausalProjection.project(causes, defaultConfig);
    expect(result.category).toBe('media_pressure_dominant');
    expect(result.intensity).toBe('severe');
  });
});
