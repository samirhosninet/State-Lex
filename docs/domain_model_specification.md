# Shadow State — Domain Model Specification

**Project**: Shadow State (Browser-Only Geopolitical Strategy Simulation MVP)  
**Document Status**: Ratified Domain Specification (v1.0.0)  

---

## 1. Domain Entities

### 1.1 `GameState` (Aggregate Root)
- **Fields**:
  - `id: string` (Unique Game Session UUID)
  - `turnNumber: TurnNumber` (Current Monotonic Turn Counter)
  - `turnSeed: TurnSeed` (32-Bit PRNG Seed)
  - `factions: Map<string, Faction>` (Factions Map: Alpha & Beta)
  - `regions: Map<string, Region>` (Regions Map: El Alamein & Ras El Hekma)
  - `actionLog: ReadonlyArray<TurnAction>` (Immutable turn command journal)
- **Invariants**:
  - `regions.size === 2` (Must contain exactly El Alamein and Ras El Hekma).
  - `factions.size === 2` (Must contain exactly Faction Alpha and Faction Beta).
  - `turnNumber.value >= 1` (Turn numbers are strictly positive integers).
- **Lifecycle**: Created via `StartGameUseCase`, mutated strictly via domain methods in `ProcessTurnUseCase`.

### 1.2 `Faction` (Aggregate Root)
- **Fields**:
  - `id: FactionId` (Unique Faction Identifier)
  - `name: string` (Faction Name)
  - `resources: FixedPointResourcePool` (Scaled BigInt Resource Pool)
  - `controlledRegionIds: ReadonlyArray<RegionId>` (List of controlled region IDs)
- **Invariants**:
  - Resources must never be negative (`resources.value >= 0n`).

### 1.3 `Region` (Entity)
- **Fields**:
  - `id: RegionId` ("EL_ALAMEIN" | "RAS_EL_HEKMA")
  - `name: string` (Display Name)
  - `controllerFactionId: FactionId` (Controlling Faction ID)
  - `infrastructureLevel: number` (Development Level 1-10)
  - `defenseLevel: number` (Defense Level 1-10)

### 1.4 `TurnAction` (Entity)
- **Fields**:
  - `id: string` (Command UUID)
  - `factionId: FactionId` (Executing Faction ID)
  - `targetRegionId: RegionId` (Target Region ID)
  - `actionType: "DEVELOP" | "FORTIFY" | "REDEPLOY"` (Command Discriminator)

---

## 2. Domain Value Objects

### 2.1 `TurnNumber`
- **Fields**: `value: number` (Integer >= 1).
- **Invariants**: Immutable; incremented strictly by `+1` per turn tick.

### 2.2 `TurnSeed`
- **Fields**: `value: number` (32-Bit Unsigned Integer).
- **Invariants**: Immutable; consumed strictly by Mulberry32 PRNG.

### 2.3 `FixedPointResourcePool`
- **Fields**: `baseUnits: bigint` (Scaled BigInt, 1 resource unit = 100 base units).
- **Invariants**: Immutable; arithmetic operations (`add`, `subtract`) return new instances without floating-point math (**ADR-004**).

### 2.4 `LLMNarrative`
- **Fields**:
  - `turnNumber: number` (Validation Tag)
  - `text: string` (Qualitative Description Text)
  - `isFallback: boolean` (True if generated via local mock)
- **Invariants**: Immutable; carries mandatory `turnNumber` to drop stale LLM responses (**Mandate M-02** & **ADR-003**).
