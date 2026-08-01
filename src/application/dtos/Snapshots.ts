export interface ActorAllocationDTO {
  readonly stateAdministration: number;
  readonly investors: number;
  readonly securityEstablishment: number;
  readonly localCommunities: number;
  readonly media: number;
}

export interface ActorTrustDTO {
  readonly scores: {
    readonly stateAdministration: number;
    readonly investors: number;
    readonly securityEstablishment: number;
    readonly localCommunities: number;
    readonly media: number;
  };
  readonly states: {
    readonly stateAdministration: string;
    readonly investors: string;
    readonly securityEstablishment: string;
    readonly localCommunities: string;
    readonly media: string;
  };
}

export interface CausalContributorDTO {
  readonly actor_index: number;
  readonly cause_type_index: number;
  readonly cause_type: string;
  readonly impact: number;
}

export interface CausalExplanationDTO {
  readonly dominantCauses: ReadonlyArray<CausalContributorDTO>;
  readonly category: string;
  readonly intensity: string;
}

export interface LastMoveDTO {
  readonly sourceIndex: number;
  readonly targetIndex: number;
  readonly amount: number;
}

export interface GameStateSnapshotDTO {
  readonly id: string;
  readonly turnNumber: number;
  readonly allocation: ActorAllocationDTO;
  readonly trust: ActorTrustDTO;
  readonly explanation: CausalExplanationDTO;
  readonly lastMove?: LastMoveDTO;
  // Retained legacy fields for un-retired legacy interfaces
  readonly turnSeed?: number;
  readonly factions?: Record<string, FactionSnapshotDTO>;
  readonly regions?: Record<string, RegionSnapshotDTO>;
  readonly actionLog?: ReadonlyArray<TurnActionSnapshotDTO>;
}

export interface SnapshotEnvelopeDTO {
  readonly schemaVersion: string; // "1.0.0"
  readonly state: GameStateSnapshotDTO;
  readonly stateHash: string;
}

// Retained legacy DTO interfaces for zero breakage during cutover
export interface ResourceSnapshotDTO {
  readonly baseUnits: string;
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
