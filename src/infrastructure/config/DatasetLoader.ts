import { readFileSync } from 'fs';
import { join } from 'path';
import { MatrixSchemaData, MatrixSchemaValidator } from '../../domain/services/MatrixSchemaValidator';

export interface BalanceConfigData {
  initialTrust: Record<string, number>;
  hysteresisThresholds: {
    UnstableEntry: number;
    UnstableExit: number;
    HostileEntry: number;
    HostileExit: number;
  };
}

export interface ExplanationClassificationRule {
  id: string;
  requires: {
    top_cause_source: string;
    cause_type: string;
    dominance_ratio: string;
    minimum_impact: number;
  };
  intensity_rules: Record<string, string>;
}

export interface ExplanationConfigData {
  tie_break: string[];
  classification_rules: ExplanationClassificationRule[];
}

export class DatasetLoader {
  private readonly _configDir: string;

  constructor(configDir?: string) {
    this._configDir = configDir || join(process.cwd(), 'src', 'infrastructure', 'config');
  }

  public loadBalanceConfig(): BalanceConfigData {
    const filePath = join(this._configDir, 'balance_config_v0.json');
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as BalanceConfigData;
  }

  public loadInfluenceMatrix(): MatrixSchemaData {
    const filePath = join(this._configDir, 'influence_matrix_v0.json');
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content) as MatrixSchemaData;
    MatrixSchemaValidator.validate(data);
    return data;
  }

  public loadExplanationConfig(): ExplanationConfigData {
    const filePath = join(this._configDir, 'explanation_config_v0.json');
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as ExplanationConfigData;
  }
}
