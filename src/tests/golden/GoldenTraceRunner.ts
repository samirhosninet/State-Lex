import { readFileSync } from 'fs';
import { join } from 'path';
import { DatasetLoader } from '../../infrastructure/config/DatasetLoader';
import { GSTTurnEngine } from '../../domain/services/TurnEngine';
import { TelemetryExporter, TurnTelemetryRecord } from '../../application/services/TelemetryExporter';

export interface GoldenTraceDataset {
  session_seed: string;
  total_turns: number;
  records: TurnTelemetryRecord[];
}

export class GoldenTraceRunner {
  public static loadGoldenTrace(filePath?: string): GoldenTraceDataset {
    const targetPath = filePath || join(process.cwd(), 'golden_trace_TASK015-GOLDEN-001.json');
    const content = readFileSync(targetPath, 'utf-8');
    return JSON.parse(content) as GoldenTraceDataset;
  }

  public static run20TurnSimulation(moves: { sourceIndex: number; targetIndex: number; amount: number }[]): TurnTelemetryRecord[] {
    const loader = new DatasetLoader();
    const engine = new GSTTurnEngine(loader.loadBalanceConfig(), loader.loadInfluenceMatrix());
    const exporter = new TelemetryExporter();

    const actualRecords: TurnTelemetryRecord[] = [];

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const turnRes = engine.executeTurn(move);
      const record = exporter.exportRecord('TASK015-GOLDEN-001', turnRes, move, 5000);
      actualRecords.push(record);
    }

    return actualRecords;
  }
}
