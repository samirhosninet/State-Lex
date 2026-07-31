import { FactionId } from '../values/FactionId';
import { RegionId } from '../values/RegionId';
import { FixedPointResourcePool } from '../values/FixedPointResourcePool';

export class Faction {
  private readonly _id: FactionId;
  private readonly _name: string;
  private readonly _resources: FixedPointResourcePool;
  private readonly _controlledRegionIds: ReadonlyArray<RegionId>;

  constructor(
    id: FactionId,
    name: string,
    resources: FixedPointResourcePool,
    controlledRegionIds: ReadonlyArray<RegionId>
  ) {
    if (!name || name.trim().length === 0) {
      throw new Error("Faction name cannot be empty.");
    }

    this._id = id;
    this._name = name;
    this._resources = resources;
    this._controlledRegionIds = Object.freeze([...controlledRegionIds]);
  }

  get id(): FactionId {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get resources(): FixedPointResourcePool {
    return this._resources;
  }

  get controlledRegionIds(): ReadonlyArray<RegionId> {
    return this._controlledRegionIds;
  }

  public withResources(newResources: FixedPointResourcePool): Faction {
    return new Faction(this._id, this._name, newResources, this._controlledRegionIds);
  }

  public withControlledRegions(newRegionIds: ReadonlyArray<RegionId>): Faction {
    return new Faction(this._id, this._name, this._resources, newRegionIds);
  }

  public equals(other: Faction): boolean {
    if (!this._id.equals(other._id) || this._name !== other._name || !this._resources.equals(other._resources)) {
      return false;
    }
    if (this._controlledRegionIds.length !== other._controlledRegionIds.length) {
      return false;
    }
    return this._controlledRegionIds.every((r, idx) => r.equals(other._controlledRegionIds[idx]));
  }
}
