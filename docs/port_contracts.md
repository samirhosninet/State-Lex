# Shadow State — Canonical Port Contracts Specification

**Single Source of Truth** for all Primary (Driving) and Secondary (Driven) application interface contracts.

---

## Primary Application Port

```typescript
export interface IGameApplicationService {
  startGame(seed?: string): Promise<GameStateDTO>;
  processTurn(command: TurnCommandDTO): Promise<GameStateDTO>;
  loadGame(): Promise<GameStateDTO | null>;
  resetGame(): Promise<void>;
}
```

---

## Secondary Infrastructure Ports

### 1. Persistence Port (`IPersistencePort`)
```typescript
export interface IPersistencePort {
  saveSnapshot(snapshot: GameStateSnapshotDTO): Promise<boolean>;
  loadActiveSnapshot(): Promise<GameStateSnapshotDTO | null>;
  clearSnapshot(): Promise<void>;
}
```

### 2. LLM Narrative Provider Port (`ILLMProviderPort`)
```typescript
export interface ILLMProviderPort {
  generateNarrative(context: NarrativeContextDTO): Promise<LLMNarrativeDTO>;
}
```

### 3. Visual Canvas Renderer Port (`IRendererPort`)
```typescript
export interface IRendererPort {
  initialize(container: HTMLElement): void;
  renderMap(viewState: MapViewStateDTO): void;
  destroy(): void;
}
```
