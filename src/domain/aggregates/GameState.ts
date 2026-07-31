import { TurnNumber } from '../values/TurnNumber';
import { TurnSeed } from '../values/TurnSeed';
import { Faction } from './Faction';
import { Region } from '../entities/Region';
import { TurnAction } from '../entities/TurnAction';

export class GameState {
  private readonly _id: string;
  private readonly _turnNumber: TurnNumber;
  private readonly _turnSeed: TurnSeed;
  private readonly _factions: Map<string, Faction>;
  private readonly _regions: Map<string, Region>;
  private readonly _actionLog: ReadonlyArray<TurnAction>;

  constructor(
    id: string,
    turnNumber: TurnNumber,
    turnSeed: TurnSeed,
    factions: Map<string, Faction>,
    regions: Map<string, Region>,
    actionLog: ReadonlyArray<TurnAction>
  ) {
    if (!id || id.trim().length === 0) {
      throw new Error("GameState id cannot be empty.");
    }
    if (regions.size !== 2) {
      throw new Error(`GameState invariant violated: regions count must be exactly 2 (El Alamein & Ras El Hekma). Found ${regions.size}.`);
    }
    if (!regions.has("EL_ALAMEIN") || !regions.has("RAS_EL_HEKMA")) {
      throw new Error("GameState invariant violated: regions must contain both 'EL_ALAMEIN' and 'RAS_EL_HEKMA'.");
    }
    if (factions.size !== 2) {
      throw new Error(`GameState invariant violated: factions count must be exactly 2 (Faction Alpha & Faction Beta). Found ${factions.size}.`);
    }
    if (!factions.has("FACTION_ALPHA") || !factions.has("FACTION_BETA")) {
      throw new Error("GameState invariant violated: factions must contain both 'FACTION_ALPHA' and 'FACTION_BETA'.");
    }

    this._id = id;
    this._turnNumber = turnNumber;
    this._turnSeed = turnSeed;
    this._factions = new Map(factions);
    this._regions = new Map(regions);
    this._actionLog = Object.freeze([...actionLog]);
  }

  get id(): string {
    return this._id;
  }

  get turnNumber(): TurnNumber {
    return this._turnNumber;
  }

  get turnSeed(): TurnSeed {
    return this._turnSeed;
  }

  get factions(): Map<string, Faction> {
    return new Map(this._factions);
  }

  get regions(): Map<string, Region> {
    return new Map(this._regions);
  }

  get actionLog(): ReadonlyArray<TurnAction> {
    return this._actionLog;
  }

  public withTurn(newTurnNumber: TurnNumber, newFactions: Map<string, Faction>, newRegions: Map<string, Region>, newActionLog: ReadonlyArray<TurnAction>): GameState {
    return new GameState(this._id, newTurnNumber, this._turnSeed, newFactions, newRegions, newActionLog);
  }
}
