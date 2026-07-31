export class FixedPointResourcePool {
  private readonly _baseUnits: bigint;

  constructor(baseUnits: bigint) {
    if (baseUnits < 0n) {
      throw new Error(`Invalid FixedPointResourcePool: '${baseUnits.toString()}n'. Base units cannot be negative.`);
    }
    this._baseUnits = baseUnits;
  }

  public static fromUnits(units: number): FixedPointResourcePool {
    if (!Number.isFinite(units) || units < 0) {
      throw new Error(`Invalid resource units: '${units}'. Must be a non-negative finite number.`);
    }
    const baseUnits = BigInt(Math.floor(units * 100));
    return new FixedPointResourcePool(baseUnits);
  }

  get baseUnits(): bigint {
    return this._baseUnits;
  }

  public toUnits(): number {
    return Number(this._baseUnits) / 100;
  }

  public add(other: FixedPointResourcePool): FixedPointResourcePool {
    return new FixedPointResourcePool(this._baseUnits + other._baseUnits);
  }

  public subtract(other: FixedPointResourcePool): FixedPointResourcePool {
    const result = this._baseUnits - other._baseUnits;
    if (result < 0n) {
      throw new Error(`Insufficient resources: cannot deduct ${other._baseUnits.toString()}n from ${this._baseUnits.toString()}n.`);
    }
    return new FixedPointResourcePool(result);
  }

  public multiplyFactor(factor: number): FixedPointResourcePool {
    if (!Number.isFinite(factor) || factor < 0) {
      throw new Error(`Invalid multiplication factor: '${factor}'. Must be a non-negative finite number.`);
    }
    const scaledFactor = BigInt(Math.floor(factor * 1000));
    const newBaseUnits = (this._baseUnits * scaledFactor) / 1000n;
    return new FixedPointResourcePool(newBaseUnits);
  }

  public toDTO(): string {
    return `${this._baseUnits.toString()}n`;
  }

  public static fromDTO(dto: string): FixedPointResourcePool {
    if (!/^\d+n$/.test(dto)) {
      throw new Error(`Invalid ResourceSnapshotDTO format: '${dto}'. Expected format e.g. '10000n'.`);
    }
    const baseUnits = BigInt(dto.replace('n', ''));
    return new FixedPointResourcePool(baseUnits);
  }

  public equals(other: FixedPointResourcePool): boolean {
    return this._baseUnits === other._baseUnits;
  }
}
