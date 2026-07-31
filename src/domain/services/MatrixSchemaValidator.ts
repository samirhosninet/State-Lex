export interface BalanceConfigData {
  initialTrust: Record<string, number>;
  hysteresisThresholds: {
    UnstableEntry: number;
    UnstableExit: number;
    HostileEntry: number;
    HostileExit: number;
  };
}

export interface MatrixSchemaData {
  schemaDomain: {
    minWeight: number;
    maxWeight: number;
  };
  vectorOrder: string[];
  edgeWeights: number[][];
  turn11Mutation: {
    sourceActor: string;
    targetActor: string;
    previousWeight: number;
    newWeight: number;
  };
}

export class MatrixSchemaValidator {
  public static validate(data: MatrixSchemaData): boolean {
    if (!data.schemaDomain || typeof data.schemaDomain.minWeight !== 'number' || typeof data.schemaDomain.maxWeight !== 'number') {
      throw new Error("Invalid Matrix Schema: Missing or malformed schemaDomain.");
    }

    if (!Array.isArray(data.vectorOrder) || data.vectorOrder.length !== 5) {
      throw new Error("Invalid Matrix Schema: vectorOrder must contain exactly 5 actors.");
    }

    if (!Array.isArray(data.edgeWeights) || data.edgeWeights.length !== 5) {
      throw new Error("Invalid Matrix Schema: edgeWeights must be a 5x5 matrix.");
    }

    for (let r = 0; r < 5; r++) {
      if (!Array.isArray(data.edgeWeights[r]) || data.edgeWeights[r].length !== 5) {
        throw new Error(`Invalid Matrix Schema: Row ${r} must contain exactly 5 weights.`);
      }
      for (let c = 0; c < 5; c++) {
        const weight = data.edgeWeights[r][c];
        if (typeof weight !== 'number' || weight < data.schemaDomain.minWeight || weight > data.schemaDomain.maxWeight) {
          throw new Error(`Invalid Matrix Schema: Weight at [${r}][${c}] (${weight}) out of domain bounds [${data.schemaDomain.minWeight}, ${data.schemaDomain.maxWeight}].`);
        }
      }
    }

    if (!data.turn11Mutation || typeof data.turn11Mutation.previousWeight !== 'number' || typeof data.turn11Mutation.newWeight !== 'number') {
      throw new Error("Invalid Matrix Schema: Missing turn11Mutation payload.");
    }

    return true;
  }
}
