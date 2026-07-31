import { GameState } from '../../domain/aggregates/GameState';
import { Faction } from '../../domain/aggregates/Faction';
import { Region } from '../../domain/entities/Region';
import { TurnAction, ValidActionType } from '../../domain/entities/TurnAction';
import { TurnNumber } from '../../domain/values/TurnNumber';
import { TurnSeed } from '../../domain/values/TurnSeed';
import { RegionId, ValidRegionId } from '../../domain/values/RegionId';
import { FactionId, ValidFactionId } from '../../domain/values/FactionId';
import { FixedPointResourcePool } from '../../domain/values/FixedPointResourcePool';
import {
  GameStateSnapshotDTO,
  FactionSnapshotDTO,
  RegionSnapshotDTO,
  TurnActionSnapshotDTO
} from '../dtos/Snapshots';

export class GameStateMapper {
  public static toSnapshot(state: GameState): GameStateSnapshotDTO {
    const factionsRecord: Record<string, FactionSnapshotDTO> = {};
    // Canonical ordering: FACTION_ALPHA then FACTION_BETA
    const sortedFactionKeys: ValidFactionId[] = ["FACTION_ALPHA", "FACTION_BETA"];
    for (const key of sortedFactionKeys) {
      const faction = state.factions.get(key);
      if (faction) {
        factionsRecord[key] = {
          id: key,
          name: faction.name,
          resources: { baseUnits: faction.resources.toDTO() },
          controlledRegionIds: faction.controlledRegionIds.map(r => r.value)
        };
      }
    }

    const regionsRecord: Record<string, RegionSnapshotDTO> = {};
    // Canonical ordering: EL_ALAMEIN then RAS_EL_HEKMA
    const sortedRegionKeys: ValidRegionId[] = ["EL_ALAMEIN", "RAS_EL_HEKMA"];
    for (const key of sortedRegionKeys) {
      const region = state.regions.get(key);
      if (region) {
        regionsRecord[key] = {
          id: key,
          name: region.name,
          controllerFactionId: region.controllerFactionId.value,
          infrastructureLevel: region.infrastructureLevel,
          defenseLevel: region.defenseLevel
        };
      }
    }

    const actionLogDTO: TurnActionSnapshotDTO[] = state.actionLog.map(act => ({
      id: act.id,
      factionId: act.factionId.value,
      targetRegionId: act.targetRegionId.value,
      actionType: act.actionType,
      turnNumber: act.turnNumber.value
    }));

    return {
      id: state.id,
      turnNumber: state.turnNumber.value,
      turnSeed: state.turnSeed.value,
      factions: factionsRecord,
      regions: regionsRecord,
      actionLog: Object.freeze(actionLogDTO)
    };
  }

  public static fromSnapshot(dto: GameStateSnapshotDTO): GameState {
    const turnNumber = new TurnNumber(dto.turnNumber);
    const turnSeed = new TurnSeed(dto.turnSeed);

    const factionsMap = new Map<string, Faction>();
    for (const key of Object.keys(dto.factions).sort()) {
      const fDto = dto.factions[key];
      const factionId = new FactionId(fDto.id);
      const resources = FixedPointResourcePool.fromDTO(fDto.resources.baseUnits);
      const regionIds = fDto.controlledRegionIds.map(r => new RegionId(r));
      factionsMap.set(key, new Faction(factionId, fDto.name, resources, regionIds));
    }

    const regionsMap = new Map<string, Region>();
    for (const key of Object.keys(dto.regions).sort()) {
      const rDto = dto.regions[key];
      const regionId = new RegionId(rDto.id);
      const controllerId = new FactionId(rDto.controllerFactionId);
      regionsMap.set(
        key,
        new Region(regionId, rDto.name, controllerId, rDto.infrastructureLevel, rDto.defenseLevel)
      );
    }

    const actionLog: TurnAction[] = dto.actionLog.map(
      aDto =>
        new TurnAction(
          aDto.id,
          new FactionId(aDto.factionId),
          new RegionId(aDto.targetRegionId),
          aDto.actionType as ValidActionType,
          new TurnNumber(aDto.turnNumber)
        )
    );

    return new GameState(dto.id, turnNumber, turnSeed, factionsMap, regionsMap, actionLog);
  }
}
