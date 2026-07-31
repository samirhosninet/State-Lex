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
}
