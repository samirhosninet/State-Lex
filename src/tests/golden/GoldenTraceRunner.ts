import { readFileSync } from 'fs';
import { join } from 'path';
import { DatasetLoader } from '../../infrastructure/config/DatasetLoader';
import { GSTTurnEngine } from '../../domain/services/TurnEngine';
import { TelemetryExporter, TurnTelemetryRecord } from '../../application/services/TelemetryExporter';

export interface GST03TraceDataset {
  scenario_id: string;
  state_origin: string;
  mutation_source: string;
  replay_turns: boolean;
  records: TurnTelemetryRecord[];
}

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

  public static loadGST03_S0Trace(): GST03TraceDataset {
    const targetPath = join(process.cwd(), 'golden_trace_GST03_S0.json');
    const content = readFileSync(targetPath, 'utf-8');
    return JSON.parse(content) as GST03TraceDataset;
  }

  public static loadGST03_S1Trace(): GST03TraceDataset {
    const targetPath = join(process.cwd(), 'golden_trace_GST03_S1.json');
    const content = readFileSync(targetPath, 'utf-8');
    return JSON.parse(content) as GST03TraceDataset;
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

  public static runGST03_S0(moves: { sourceIndex: number; targetIndex: number; amount: number }[]): TurnTelemetryRecord[] {
    const loader = new DatasetLoader();
    const engine = new GSTTurnEngine(loader.loadBalanceConfig(), loader.loadInfluenceMatrix());
    const exporter = new TelemetryExporter();

    const actualRecords: TurnTelemetryRecord[] = [];

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const turnRes = engine.executeTurn(move);
      const record = exporter.exportRecord('GST03A-S0-SEED', turnRes, move, 5000);
      actualRecords.push(record);
    }

    return actualRecords;
  }

  public static runGST03_S1(moves: { sourceIndex: number; targetIndex: number; amount: number }[]): TurnTelemetryRecord[] {
    const loader = new DatasetLoader();
    const balanceConfig = loader.loadBalanceConfig();
    const matrixData = loader.loadInfluenceMatrix();

    // S1: Apply Turn 11 mutation payload directly to matrix schema
    matrixData.edgeWeights[0][1] = 0.5;

    const engine = new GSTTurnEngine(balanceConfig, matrixData);
    const exporter = new TelemetryExporter();

    const actualRecords: TurnTelemetryRecord[] = [];

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const turnRes = engine.executeTurn(move);
      const record = exporter.exportRecord('GST03B-S1-SEED', turnRes, move, 5000);
      actualRecords.push(record);
    }

    return actualRecords;
  }
}
