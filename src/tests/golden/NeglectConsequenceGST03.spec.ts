import { describe, it, expect } from 'vitest';
import { DatasetLoader } from '../../infrastructure/config/DatasetLoader';
import { GSTTurnEngine } from '../../domain/services/TurnEngine';
import { TelemetryExporter } from '../../application/services/TelemetryExporter';

describe('Scenario GST-03: Neglect Consequence Validation & Idempotency', () => {
  it('triggers neglect consequence after 3 consecutive below-threshold turns and enforces idempotency', () => {
    const loader = new DatasetLoader();
    const engine = new GSTTurnEngine(loader.loadBalanceConfig(), loader.loadInfluenceMatrix());
    const exporter = new TelemetryExporter();

    // Drain Media capacity to 0 at Turn 1
    const res1 = engine.executeTurn({ sourceIndex: 4, targetIndex: 0, amount: 20 });
    const rec1 = exporter.exportRecord('TASK015-GOLDEN-001', res1, { sourceIndex: 4, targetIndex: 0, amount: 20 });

    // Turn 2: keep Media at 0
    const res2 = engine.executeTurn({ sourceIndex: 1, targetIndex: 2, amount: 5 });
    const rec2 = exporter.exportRecord('TASK015-GOLDEN-001', res2, { sourceIndex: 1, targetIndex: 2, amount: 5 });

    // Turn 3: keep Media at 0 (3rd consecutive below-threshold turn)
    const res3 = engine.executeTurn({ sourceIndex: 2, targetIndex: 3, amount: 5 });
    const rec3 = exporter.exportRecord('TASK015-GOLDEN-001', res3, { sourceIndex: 2, targetIndex: 3, amount: 5 });

    // Turn 4: keep Media at 0 (4th consecutive turn)
    const res4 = engine.executeTurn({ sourceIndex: 3, targetIndex: 0, amount: 5 });
    const rec4 = exporter.exportRecord('TASK015-GOLDEN-001', res4, { sourceIndex: 3, targetIndex: 0, amount: 5 });

    expect(rec1.consequences.length).toBe(0);
    expect(rec2.consequences.length).toBe(0);
    expect(rec3.consequences.length).toBe(1);
    expect(rec3.consequences[0].actor).toBe('LocalCommunities');

    // Assert Idempotency: Turn 4 produces zero additional consequence for LocalCommunities
    expect(rec4.consequences.length).toBe(0);
  });
});
