export interface ResourceSnapshotDTO {
  readonly baseUnits: string; // BigInt encoded string e.g. "10000n"
}

export interface FactionSnapshotDTO {
  readonly id: "FACTION_ALPHA" | "FACTION_BETA";
  readonly name: string;
  readonly resources: ResourceSnapshotDTO;
  readonly controlledRegionIds: ReadonlyArray<"EL_ALAMEIN" | "RAS_EL_HEKMA">;
}

export interface RegionSnapshotDTO {
  readonly id: "EL_ALAMEIN" | "RAS_EL_HEKMA";
  readonly name: string;
  readonly controllerFactionId: "FACTION_ALPHA" | "FACTION_BETA";
  readonly infrastructureLevel: number;
  readonly defenseLevel: number;
}

export interface TurnActionSnapshotDTO {
  readonly id: string;
  readonly factionId: "FACTION_ALPHA" | "FACTION_BETA";
  readonly targetRegionId: "EL_ALAMEIN" | "RAS_EL_HEKMA";
  readonly actionType: "DEVELOP" | "FORTIFY" | "REDEPLOY";
  readonly turnNumber: number;
}

export interface GameStateSnapshotDTO {
  readonly id: string;
  readonly turnNumber: number;
  readonly turnSeed: number;
  readonly factions: Record<string, FactionSnapshotDTO>;
  readonly regions: Record<string, RegionSnapshotDTO>;
  readonly actionLog: ReadonlyArray<TurnActionSnapshotDTO>;
}

export interface SnapshotEnvelopeDTO {
  readonly schemaVersion: string; // "1.0.0"
  readonly state: GameStateSnapshotDTO;
  readonly stateHash: string;
}
