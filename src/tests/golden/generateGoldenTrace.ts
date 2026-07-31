import { writeFileSync } from 'fs';
import { join } from 'path';
import { DatasetLoader } from '../../infrastructure/config/DatasetLoader';
import { GSTTurnEngine } from '../../domain/services/TurnEngine';
import { TelemetryExporter, TurnTelemetryRecord } from '../../application/services/TelemetryExporter';

function generateGoldenTrace(): void {
  const loader = new DatasetLoader();
  const engine = new GSTTurnEngine(loader.loadBalanceConfig(), loader.loadInfluenceMatrix());
  const exporter = new TelemetryExporter();

  const moves: { sourceIndex: number; targetIndex: number; amount: number }[] = [];
  for (let i = 0; i < 20; i++) {
    moves.push({
      sourceIndex: i % 5,
      targetIndex: (i + 1) % 5,
      amount: 5
    });
  }

  const records: TurnTelemetryRecord[] = [];

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const turnRes = engine.executeTurn(move);
    const record = exporter.exportRecord('TASK015-GOLDEN-001', turnRes, move, 5000);
    records.push(record);
  }

  const outputData = {
    session_seed: "TASK015-GOLDEN-001",
    total_turns: 20,
    records
  };

  const targetPath = join(process.cwd(), 'golden_trace_TASK015-GOLDEN-001.json');
  writeFileSync(targetPath, JSON.stringify(outputData, null, 2), 'utf-8');
  console.log(`Generated golden trace dataset at '${targetPath}'`);
}

generateGoldenTrace();
