import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import { DatasetLoader } from '../../infrastructure/config/DatasetLoader';

describe('DatasetLoaderExplanationConfig (Phase 1)', () => {
  it('1. verifies explanation_config_v0.json exists on disk', () => {
    const configPath = join(process.cwd(), 'src', 'infrastructure', 'config', 'explanation_config_v0.json');
    expect(existsSync(configPath)).toBe(true);
  });

  it('2-10. loads explanation_config_v0.json using DatasetLoader and validates all 10 invariants', () => {
    const loader = new DatasetLoader();
    const config = loader.loadExplanationConfig();

    // 2. DatasetLoader loaded dataset
    expect(config).toBeDefined();

    // 3. tie_break order is exactly ['magnitude', 'actor_index', 'cause_type_index']
    expect(config.tie_break).toEqual(['magnitude', 'actor_index', 'cause_type_index']);

    // 4. classification_rules exists
    expect(Array.isArray(config.classification_rules)).toBe(true);
    expect(config.classification_rules.length).toBeGreaterThan(0);

    for (const rule of config.classification_rules) {
      // 5. Every classification rule contains requires.top_cause_source
      expect(rule.requires.top_cause_source).toBeDefined();

      // 6. Value equals 'dominant_causes[0]'
      expect(rule.requires.top_cause_source).toBe('dominant_causes[0]');

      // 7. dominance_ratio remains '>=0.50'
      expect(rule.requires.dominance_ratio).toBe('>=0.50');

      // 8. minimum_impact exists
      expect(typeof rule.requires.minimum_impact).toBe('number');

      // 9. intensity_rules exists
      expect(rule.intensity_rules).toBeDefined();

      // 10. moderate and severe predicates exist
      expect(rule.intensity_rules.moderate).toBe('>=5');
      expect(rule.intensity_rules.severe).toBe('>=10');
    }
  });
});
