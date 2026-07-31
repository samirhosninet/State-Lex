import { GameState } from '../aggregates/GameState';
import { Faction } from '../aggregates/Faction';
import { Region } from '../entities/Region';
import { TurnNumber } from '../values/TurnNumber';
import { TurnSeed } from '../values/TurnSeed';
import { RegionId } from '../values/RegionId';
import { FactionId } from '../values/FactionId';
import { FixedPointResourcePool } from '../values/FixedPointResourcePool';

export function createInitialGameState(id = "game-001", seedValue = 123456789): GameState {
  const turnNumber = new TurnNumber(1);
  const turnSeed = new TurnSeed(seedValue);

  const regionElAlameinId = new RegionId("EL_ALAMEIN");
  const regionRasElHekmaId = new RegionId("RAS_EL_HEKMA");

  const factionAlphaId = new FactionId("FACTION_ALPHA");
  const factionBetaId = new FactionId("FACTION_BETA");

  const initialResources = FixedPointResourcePool.fromUnits(100); // 10000n base units

  const factionAlpha = new Faction(factionAlphaId, "Faction Alpha", initialResources, [regionElAlameinId]);
  const factionBeta = new Faction(factionBetaId, "Faction Beta", initialResources, [regionRasElHekmaId]);

  const regionElAlamein = new Region(regionElAlameinId, "El Alamein", factionAlphaId, 1, 1);
  const regionRasElHekma = new Region(regionRasElHekmaId, "Ras El Hekma", factionBetaId, 1, 1);

  const factionsMap = new Map<string, Faction>([
    ["FACTION_ALPHA", factionAlpha],
    ["FACTION_BETA", factionBeta]
  ]);

  const regionsMap = new Map<string, Region>([
    ["EL_ALAMEIN", regionElAlamein],
    ["RAS_EL_HEKMA", regionRasElHekma]
  ]);

  return new GameState(id, turnNumber, turnSeed, factionsMap, regionsMap, []);
}
