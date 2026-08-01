import { describe, it, expect } from 'vitest';
import { DatasetLoader } from '../../infrastructure/config/DatasetLoader';
import { MatrixSchemaValidator, MatrixSchemaData } from '../../domain/services/MatrixSchemaValidator';

describe('DatasetLoader & MatrixSchemaValidator (Phase 1)', () => {
  it('loads valid balance_config_v0.json and influence_matrix_v0.json datasets', () => {
    const loader = new DatasetLoader();
    const balanceConfig = loader.loadBalanceConfig();
    const matrixData = loader.loadInfluenceMatrix();

    expect(balanceConfig.initialTrust.StateAdministration).toBe(50);
    expect(balanceConfig.hysteresisThresholds.UnstableEntry).toBe(35);

    expect(matrixData.vectorOrder.length).toBe(5);
    expect(matrixData.edgeWeights.length).toBe(5);
    expect(matrixData.turn11Mutation.sourceActor).toBe('StateAdministration');
  });

  it('rejects matrix with out-of-bounds weight', () => {
    const invalidData = {
      schemaDomain: { minWeight: -1.0, maxWeight: 1.0 },
      vectorOrder: ["A", "B", "C", "D", "E"],
      edgeWeights: [
        [0.0, 1.5, 0.0, 0.0, 0.0],
        [0.0, 0.0, 0.0, 0.0, 0.0],
        [0.0, 0.0, 0.0, 0.0, 0.0],
        [0.0, 0.0, 0.0, 0.0, 0.0],
        [0.0, 0.0, 0.0, 0.0, 0.0]
      ],
      turn11Mutation: { sourceActor: "A", targetActor: "B", previousWeight: 0, newWeight: 0.5 }
    };

    expect(() => MatrixSchemaValidator.validate(invalidData as MatrixSchemaData)).toThrow(/out of domain bounds/);
  });
});
