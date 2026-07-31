import { describe, it, expect } from 'vitest';
import { DatasetLoader } from '../../infrastructure/config/DatasetLoader';
import { GSTTurnEngine } from '../../domain/services/TurnEngine';
import { TelemetryExporter } from '../../application/services/TelemetryExporter';
import { DecisionDiversityCalculator } from '../../application/services/DecisionDiversityCalculator';

describe('TelemetryExporter & DecisionDiversityCalculator (Phase 3)', () => {
  it('exports 11-field TurnTelemetry record preserving fixed vector order', () => {
    const loader = new DatasetLoader();
    const engine = new GSTTurnEngine(loader.loadBalanceConfig(), loader.loadInfluenceMatrix());
    const exporter = new TelemetryExporter();

    const turnRes = engine.executeTurn({ sourceIndex: 0, targetIndex: 1, amount: 5 });
    const record = exporter.exportRecord('TASK015-GOLDEN-001', turnRes, { sourceIndex: 0, targetIndex: 1, amount: 5 });

    expect(record.session_seed).toBe('TASK015-GOLDEN-001');
    expect(record.turn_number).toBe(1);
    expect(record.allocation_before.stateAdministration).toBe(20);
    expect(record.allocation_after.investors).toBe(25);
    expect(record.trust_states_before.length).toBe(5);
    expect(record.trust_states_after.length).toBe(5);
    expect(record.trust_states_before[0].actor).toBe('StateAdministration');
  });

  it('computes Dominance Ratio correctly from allocation_after vectors', () => {
    const loader = new DatasetLoader();
    const engine = new GSTTurnEngine(loader.loadBalanceConfig(), loader.loadInfluenceMatrix());
    const exporter = new TelemetryExporter();

    const records = [];
    for (let turn = 1; turn <= 5; turn++) {
      const turnRes = engine.executeTurn({ sourceIndex: (turn - 1) % 5, targetIndex: turn % 5, amount: 5 });
      records.push(exporter.exportRecord('TASK015-GOLDEN-001', turnRes, { sourceIndex: (turn - 1) % 5, targetIndex: turn % 5, amount: 5 }));
    }

    const divResult = DecisionDiversityCalculator.compute(records);
    expect(divResult.totalDecisionUnits).toBe(5);
    expect(divResult.uniquePatternsCount).toBe(5);
    expect(divResult.dominanceRatio).toBe(0.2); // 1/5 = 0.2
    expect(divResult.status).toBe('PASS');
  });
});
