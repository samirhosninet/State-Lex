import { FactionId } from '../values/FactionId';
import { RegionId } from '../values/RegionId';
import { TurnNumber } from '../values/TurnNumber';

export type ValidActionType = "DEVELOP" | "FORTIFY" | "REDEPLOY";

export class TurnAction {
  private readonly _id: string;
  private readonly _factionId: FactionId;
  private readonly _targetRegionId: RegionId;
  private readonly _actionType: ValidActionType;
  private readonly _turnNumber: TurnNumber;

  constructor(
    id: string,
    factionId: FactionId,
    targetRegionId: RegionId,
    actionType: ValidActionType,
    turnNumber: TurnNumber
  ) {
    if (!id || id.trim().length === 0) {
      throw new Error("TurnAction id cannot be empty.");
    }
    if (actionType !== "DEVELOP" && actionType !== "FORTIFY" && actionType !== "REDEPLOY") {
      throw new Error(`Invalid actionType: '${actionType}'. Must be 'DEVELOP', 'FORTIFY', or 'REDEPLOY'.`);
    }

    this._id = id;
    this._factionId = factionId;
    this._targetRegionId = targetRegionId;
    this._actionType = actionType;
    this._turnNumber = turnNumber;
  }

  get id(): string {
    return this._id;
  }

  get factionId(): FactionId {
    return this._factionId;
  }

  get targetRegionId(): RegionId {
    return this._targetRegionId;
  }

  get actionType(): ValidActionType {
    return this._actionType;
  }

  get turnNumber(): TurnNumber {
    return this._turnNumber;
  }

  public equals(other: TurnAction): boolean {
    return (
      this._id === other._id &&
      this._factionId.equals(other._factionId) &&
      this._targetRegionId.equals(other._targetRegionId) &&
      this._actionType === other._actionType &&
      this._turnNumber.equals(other._turnNumber)
    );
  }
}
