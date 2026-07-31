export class TurnNumber {
  private readonly _value: number;

  constructor(value: number) {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error(`Invalid TurnNumber: '${value}'. Must be a strictly positive integer >= 1.`);
    }
    this._value = value;
  }

  get value(): number {
    return this._value;
  }

  public next(): TurnNumber {
    return new TurnNumber(this._value + 1);
  }

  public equals(other: TurnNumber): boolean {
    return this._value === other._value;
  }
}
