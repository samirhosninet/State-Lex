# Shadow State — Canonical Port Contracts Specification

**Single Source of Truth** for all Primary (Driving) and Secondary (Driven) application interface contracts.

---

## 1. Primary Application Port (Driving)

### `IGameApplicationService`
- **Responsibility**: Orchestrates application use cases (`StartGameUseCase`, `ProcessTurnUseCase`).
- **TypeScript Contract**:
  ```typescript
  export interface IGameApplicationService {
    startGame(seed?: string): Promise<GameStateDTO>;
    processTurn(command: TurnCommandDTO): Promise<GameStateDTO>;
    loadGame(): Promise<GameStateDTO | null>;
    resetGame(): Promise<void>;
  }
  ```
- **Failure Behavior**: Throws typed `ApplicationError` on invalid inputs; preserves previous game state on failure.

---

## 2. Secondary Infrastructure Ports (Driven)

### 2.1 Persistence Port (`IPersistencePort`)
- **Responsibility**: Manages atomic local snapshot persistence and fallback storage.
- **TypeScript Contract**:
  ```typescript
  export interface IPersistencePort {
    saveSnapshot(snapshot: GameStateSnapshotDTO): Promise<boolean>;
    loadActiveSnapshot(): Promise<GameStateSnapshotDTO | null>;
    clearSnapshot(): Promise<void>;
  }
  ```
- **Failure Behavior**: Catches storage quota exceptions and automatically transitions to `MemoryStorageAdapter` (**ADR-005**).

### 2.2 LLM Narrative Provider Port (`ILLMProviderPort`)
- **Responsibility**: Generates read-only qualitative narrative text from turn context.
- **TypeScript Contract**:
  ```typescript
  export interface ILLMProviderPort {
    generateNarrative(context: NarrativeContextDTO): Promise<LLMNarrativeDTO>;
  }
  ```
- **Failure Behavior**: Enforces 3000ms circuit breaker timeout; automatically fails over to `MockLLMAdapter` (**ADR-003**).

### 2.3 Visual Canvas Renderer Port (`IRendererPort`)
- **Responsibility**: Renders 2D map graphics for El Alamein and Ras El Hekma.
- **TypeScript Contract**:
  ```typescript
  export interface IRendererPort {
    initialize(container: HTMLElement): void;
    renderMap(viewState: MapViewStateDTO): void;
    destroy(): void;
  }
  ```
- **Failure Behavior**: Gracefully logs canvas initialization errors without halting core simulation engine.
