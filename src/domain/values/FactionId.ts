export type ValidFactionId = "FACTION_ALPHA" | "FACTION_BETA";

export class FactionId {
  private readonly _value: ValidFactionId;

  constructor(value: string) {
    if (value !== "FACTION_ALPHA" && value !== "FACTION_BETA") {
      throw new Error(`Invalid FactionId: '${value}'. Must be 'FACTION_ALPHA' or 'FACTION_BETA'.`);
    }
    this._value = value;
  }

  get value(): ValidFactionId {
    return this._value;
  }

  public equals(other: FactionId): boolean {
    return this._value === other._value;
  }
}
