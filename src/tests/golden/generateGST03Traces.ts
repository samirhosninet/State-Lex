import { writeFileSync } from 'fs';
import { join } from 'path';
import { DatasetLoader } from '../../infrastructure/config/DatasetLoader';
import { GSTTurnEngine } from '../../domain/services/TurnEngine';
import { TelemetryExporter, TurnTelemetryRecord } from '../../application/services/TelemetryExporter';

function generateGST03Traces(): void {
  const loader = new DatasetLoader();
  const balanceConfig = loader.loadBalanceConfig();
  const matrixData = loader.loadInfluenceMatrix();
  const exporter = new TelemetryExporter();

  // --- GST-03a (Fresh S0) ---
  const engineS0 = new GSTTurnEngine(balanceConfig, matrixData);
  const movesS0 = [
    { sourceIndex: 4, targetIndex: 0, amount: 20 },
    { sourceIndex: 1, targetIndex: 2, amount: 5 },
    { sourceIndex: 2, targetIndex: 3, amount: 5 },
    { sourceIndex: 3, targetIndex: 0, amount: 5 }
  ];

  const recordsS0: TurnTelemetryRecord[] = movesS0.map((move) => {
    const res = engineS0.executeTurn(move);
    return exporter.exportRecord('GST03A-S0-SEED', res, move, 5000);
  });

  const traceS0 = {
    scenario_id: "GST-03a",
    state_origin: "FRESH_S0",
    mutation_source: "NONE",
    replay_turns: false,
    records: recordsS0
  };

  writeFileSync(
    join(process.cwd(), 'golden_trace_GST03_S0.json'),
    JSON.stringify(traceS0, null, 2),
    'utf-8'
  );

  // --- GST-03b (Post-Mutation S1) ---
  // Apply Turn 11 mutation payload directly to matrix data for S1 state
  const matrixDataS1 = JSON.parse(JSON.stringify(matrixData));
  matrixDataS1.edgeWeights[0][1] = 0.5; // Turn 11 mutation applied

  const engineS1 = new GSTTurnEngine(balanceConfig, matrixDataS1);
  const movesS1 = [
    { sourceIndex: 4, targetIndex: 0, amount: 20 },
    { sourceIndex: 1, targetIndex: 2, amount: 5 },
    { sourceIndex: 2, targetIndex: 3, amount: 5 },
    { sourceIndex: 3, targetIndex: 0, amount: 5 }
  ];

  const recordsS1: TurnTelemetryRecord[] = movesS1.map((move) => {
    const res = engineS1.executeTurn(move);
    return exporter.exportRecord('GST03B-S1-SEED', res, move, 5000);
  });

  const traceS1 = {
    scenario_id: "GST-03b",
    state_origin: "POST_MUTATION_S1",
    mutation_source: "GST-02",
    replay_turns: false,
    records: recordsS1
  };

  writeFileSync(
    join(process.cwd(), 'golden_trace_GST03_S1.json'),
    JSON.stringify(traceS1, null, 2),
    'utf-8'
  );

  console.log("Successfully generated golden_trace_GST03_S0.json and golden_trace_GST03_S1.json.");
}

generateGST03Traces();
