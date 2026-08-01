import balanceConfigJson from './balance_config_v0.json';
import influenceMatrixJson from './influence_matrix_v0.json';
import explanationConfigJson from './explanation_config_v0.json';
import { MatrixSchemaData, MatrixSchemaValidator } from '../../domain/services/MatrixSchemaValidator';
import { ExplanationConfigData } from '../../domain/services/ExplanationConfigTypes';

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
  private readonly _configDir?: string;

  constructor(configDir?: string) {
    this._configDir = configDir;
  }

  public loadBalanceConfig(): BalanceConfigData {
    if (this._configDir && typeof process !== 'undefined' && process.versions?.node) {
      // Dynamic Node.js file system read for custom test directories
      /* eslint-disable-next-line @typescript-eslint/no-var-requires */
      const fs = require('fs');
      /* eslint-disable-next-line @typescript-eslint/no-var-requires */
      const path = require('path');
      const filePath = path.join(this._configDir, 'balance_config_v0.json');
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as BalanceConfigData;
    }
    return balanceConfigJson as unknown as BalanceConfigData;
  }

  public loadInfluenceMatrix(): MatrixSchemaData {
    let data: MatrixSchemaData;
    if (this._configDir && typeof process !== 'undefined' && process.versions?.node) {
      /* eslint-disable-next-line @typescript-eslint/no-var-requires */
      const fs = require('fs');
      /* eslint-disable-next-line @typescript-eslint/no-var-requires */
      const path = require('path');
      const filePath = path.join(this._configDir, 'influence_matrix_v0.json');
      const content = fs.readFileSync(filePath, 'utf-8');
      data = JSON.parse(content) as MatrixSchemaData;
    } else {
      data = influenceMatrixJson as unknown as MatrixSchemaData;
    }
    MatrixSchemaValidator.validate(data);
    return data;
  }

  public loadExplanationConfig(): ExplanationConfigData {
    if (this._configDir && typeof process !== 'undefined' && process.versions?.node) {
      /* eslint-disable-next-line @typescript-eslint/no-var-requires */
      const fs = require('fs');
      /* eslint-disable-next-line @typescript-eslint/no-var-requires */
      const path = require('path');
      const filePath = path.join(this._configDir, 'explanation_config_v0.json');
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as ExplanationConfigData;
    }
    return explanationConfigJson as unknown as ExplanationConfigData;
  }
}
