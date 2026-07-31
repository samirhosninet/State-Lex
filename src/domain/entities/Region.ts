import { RegionId } from '../values/RegionId';
import { FactionId } from '../values/FactionId';

export class Region {
  private readonly _id: RegionId;
  private readonly _name: string;
  private readonly _controllerFactionId: FactionId;
  private readonly _infrastructureLevel: number;
  private readonly _defenseLevel: number;

  constructor(
    id: RegionId,
    name: string,
    controllerFactionId: FactionId,
    infrastructureLevel: number,
    defenseLevel: number
  ) {
    if (!name || name.trim().length === 0) {
      throw new Error("Region name cannot be empty.");
    }
    if (!Number.isInteger(infrastructureLevel) || infrastructureLevel < 1 || infrastructureLevel > 10) {
      throw new Error(`Invalid infrastructureLevel: '${infrastructureLevel}'. Must be an integer between 1 and 10.`);
    }
    if (!Number.isInteger(defenseLevel) || defenseLevel < 1 || defenseLevel > 10) {
      throw new Error(`Invalid defenseLevel: '${defenseLevel}'. Must be an integer between 1 and 10.`);
    }

    this._id = id;
    this._name = name;
    this._controllerFactionId = controllerFactionId;
    this._infrastructureLevel = infrastructureLevel;
    this._defenseLevel = defenseLevel;
  }

  get id(): RegionId {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get controllerFactionId(): FactionId {
    return this._controllerFactionId;
  }

  get infrastructureLevel(): number {
    return this._infrastructureLevel;
  }

  get defenseLevel(): number {
    return this._defenseLevel;
  }

  public withInfrastructureLevel(newLevel: number): Region {
    return new Region(this._id, this._name, this._controllerFactionId, newLevel, this._defenseLevel);
  }

  public withDefenseLevel(newLevel: number): Region {
    return new Region(this._id, this._name, this._controllerFactionId, this._infrastructureLevel, newLevel);
  }

  public withController(newController: FactionId): Region {
    return new Region(this._id, this._name, newController, this._infrastructureLevel, this._defenseLevel);
  }

  public equals(other: Region): boolean {
    return (
      this._id.equals(other._id) &&
      this._name === other._name &&
      this._controllerFactionId.equals(other._controllerFactionId) &&
      this._infrastructureLevel === other._infrastructureLevel &&
      this._defenseLevel === other._defenseLevel
    );
  }
}
