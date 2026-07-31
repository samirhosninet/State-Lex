import { describe, it, expect } from 'vitest';
import { DatasetLoader } from '../../infrastructure/config/DatasetLoader';
import { GSTTurnEngine } from '../../domain/services/TurnEngine';
import { TelemetryExporter } from '../../application/services/TelemetryExporter';

describe('Scenario GST-02: Turn 11 Rule Mutation Non-Retroactive Execution', () => {
  it('triggers Rule Mutation exactly at Turn 11 step 6 and applies to Turn 12+ calculations', () => {
    const loader = new DatasetLoader();
    const engine = new GSTTurnEngine(loader.loadBalanceConfig(), loader.loadInfluenceMatrix());
    const exporter = new TelemetryExporter();

    const records = [];
    for (let turn = 1; turn <= 15; turn++) {
      const move = { sourceIndex: (turn - 1) % 5, targetIndex: turn % 5, amount: 5 };
      const turnRes = engine.executeTurn(move);
      const rec = exporter.exportRecord('TASK015-GOLDEN-001', turnRes, move, 5000);
      records.push(rec);
    }

    // Assert Rule Mutation fires only at Turn 11
    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      if (rec.turn_number === 11) {
        expect(rec.rule_mutation_triggered).toBe(true);
        expect(rec.world_changes.length).toBe(1);
        expect(rec.world_changes[0].edgeChanged).toEqual(['StateAdministration', 'Investors']);
        expect(rec.world_changes[0].previousWeight).toBe(0.2);
        expect(rec.world_changes[0].newWeight).toBe(0.5);
      } else {
        expect(rec.rule_mutation_triggered).toBe(false);
        expect(rec.world_changes.length).toBe(0);
      }
    }
  });
});
