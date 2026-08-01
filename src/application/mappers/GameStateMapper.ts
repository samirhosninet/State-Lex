import { GSTTurnEngine } from '../../domain/services/TurnEngine';
import { GameState } from '../../domain/aggregates/GameState';
import { Faction } from '../../domain/aggregates/Faction';
import { Region } from '../../domain/entities/Region';
import { TurnAction, ValidActionType } from '../../domain/entities/TurnAction';
import { TurnNumber } from '../../domain/values/TurnNumber';
import { TurnSeed } from '../../domain/values/TurnSeed';
import { RegionId, ValidRegionId } from '../../domain/values/RegionId';
import { FactionId, ValidFactionId } from '../../domain/values/FactionId';
import { FixedPointResourcePool } from '../../domain/values/FixedPointResourcePool';
import { BalanceConfigData, MatrixSchemaData } from '../../domain/services/MatrixSchemaValidator';
import {
  GameStateSnapshotDTO,
  ActorAllocationDTO,
  ActorTrustDTO,
  CausalExplanationDTO,
  LastMoveDTO,
  FactionSnapshotDTO,
  RegionSnapshotDTO,
  TurnActionSnapshotDTO
} from '../dtos/Snapshots';

export class GameStateMapper {
  /**
   * Maps a GSTTurnEngine instance into a GameStateSnapshotDTO.
   */
  public static toGSTSnapshot(
    engine: GSTTurnEngine,
    explanation?: CausalExplanationDTO,
    lastMove?: LastMoveDTO
  ): GameStateSnapshotDTO {
    const allocArr = engine.allocationVector;
    const scoresArr = engine.internalScores;
    const statesArr = engine.trustStates;

    const allocation: ActorAllocationDTO = {
      stateAdministration: allocArr[0],
      investors: allocArr[1],
      securityEstablishment: allocArr[2],
      localCommunities: allocArr[3],
      media: allocArr[4]
    };

    const trust: ActorTrustDTO = {
      scores: {
        stateAdministration: scoresArr[0],
        investors: scoresArr[1],
        securityEstablishment: scoresArr[2],
        localCommunities: scoresArr[3],
        media: scoresArr[4]
      },
      states: {
        stateAdministration: statesArr[0],
        investors: statesArr[1],
        securityEstablishment: statesArr[2],
        localCommunities: statesArr[3],
        media: statesArr[4]
      }
    };

    return {
      id: "game-001",
      turnNumber: engine.turnNumber,
      allocation,
      trust,
      explanation: explanation || { dominantCauses: [], category: "unclassified", intensity: "none" },
      lastMove
    };
  }

  /**
   * Rehydrates a GSTTurnEngine instance from a GameStateSnapshotDTO.
   */
  public static fromGSTSnapshot(
    dto: GameStateSnapshotDTO,
    balanceConfig: BalanceConfigData,
    matrixData: MatrixSchemaData
  ): GSTTurnEngine {
    const engine = new GSTTurnEngine(balanceConfig, matrixData);
    if (dto && dto.allocation && dto.trust) {
      const allocVec = [
        dto.allocation.stateAdministration ?? 20,
        dto.allocation.investors ?? 20,
        dto.allocation.securityEstablishment ?? 20,
        dto.allocation.localCommunities ?? 20,
        dto.allocation.media ?? 20
      ];
      const scoresVec = [
        dto.trust.scores?.stateAdministration ?? 50,
        dto.trust.scores?.investors ?? 50,
        dto.trust.scores?.securityEstablishment ?? 50,
        dto.trust.scores?.localCommunities ?? 50,
        dto.trust.scores?.media ?? 50
      ];

      engine.rehydrateState(dto.turnNumber || 1, allocVec, scoresVec);
    }
    return engine;
  }

  // --- Retained Legacy Mapping Helpers for Backward Compatibility ---
  public static toSnapshot(state: GameState | GSTTurnEngine): GameStateSnapshotDTO {
    if (state instanceof GSTTurnEngine) {
      return GameStateMapper.toGSTSnapshot(state);
    }

    const factionsRecord: Record<string, FactionSnapshotDTO> = {};
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
    } as unknown as GameStateSnapshotDTO;
  }

  public static fromSnapshot(dto: GameStateSnapshotDTO): GameState {
    const turnNumber = new TurnNumber(dto.turnNumber || 1);
    const turnSeed = new TurnSeed(dto.turnSeed || 123456789);

    const factionsMap = new Map<string, Faction>();
    if (dto.factions) {
      for (const key of Object.keys(dto.factions).sort()) {
        const fDto = dto.factions[key];
        const factionId = new FactionId(fDto.id);
        const resources = FixedPointResourcePool.fromDTO(fDto.resources.baseUnits);
        const regionIds = fDto.controlledRegionIds.map(r => new RegionId(r));
        factionsMap.set(key, new Faction(factionId, fDto.name, resources, regionIds));
      }
    }

    const regionsMap = new Map<string, Region>();
    if (dto.regions) {
      for (const key of Object.keys(dto.regions).sort()) {
        const rDto = dto.regions[key];
        const regionId = new RegionId(rDto.id);
        const controllerId = new FactionId(rDto.controllerFactionId);
        regionsMap.set(
          key,
          new Region(regionId, rDto.name, controllerId, rDto.infrastructureLevel, rDto.defenseLevel)
        );
      }
    }

    const actionLog: TurnAction[] = (dto.actionLog || []).map(
      aDto =>
        new TurnAction(
          aDto.id,
          new FactionId(aDto.factionId),
          new RegionId(aDto.targetRegionId),
          aDto.actionType as ValidActionType,
          new TurnNumber(aDto.turnNumber)
        )
    );

    return new GameState(dto.id || "game-001", turnNumber, turnSeed, factionsMap, regionsMap, actionLog);
  }
}
