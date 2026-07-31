export type ValidRegionId = "EL_ALAMEIN" | "RAS_EL_HEKMA";

export class RegionId {
  private readonly _value: ValidRegionId;

  constructor(value: string) {
    if (value !== "EL_ALAMEIN" && value !== "RAS_EL_HEKMA") {
      throw new Error(`Invalid RegionId: '${value}'. Must be 'EL_ALAMEIN' or 'RAS_EL_HEKMA'.`);
    }
    this._value = value;
  }

  get value(): ValidRegionId {
    return this._value;
  }

  public equals(other: RegionId): boolean {
    return this._value === other._value;
  }
}
