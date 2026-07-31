export class TurnSeed {
  private readonly _value: number;

  constructor(value: number) {
    if (!Number.isInteger(value) || value < 0 || value > 0xFFFFFFFF) {
      throw new Error(`Invalid TurnSeed: '${value}'. Must be a 32-bit unsigned integer (0..4294967295).`);
    }
    this._value = value >>> 0;
  }

  get value(): number {
    return this._value;
  }

  public equals(other: TurnSeed): boolean {
    return this._value === other._value;
  }
}
