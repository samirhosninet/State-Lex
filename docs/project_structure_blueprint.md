# Shadow State — Project Structure & Folder Blueprint

**Project**: Shadow State (Browser-Only Geopolitical Strategy Simulation MVP)  
**Document Status**: Architectural Directory Blueprint (**ADR-001**)  

---

> [!NOTE]
> ### ARCHITECTURAL BLUEPRINT NOTICE
> This document specifies the exact folder structure for future Phase 1 implementation.
> 
> **Zero production source files (`.ts`, `.tsx`, `.js`) currently exist in `src/`.**

---

## Target Codebase Directory Structure (`src/`)

```
src/
├── domain/                                 # Pure ES Logic (Zero External Dependencies)
│   ├── aggregates/
│   │   ├── GameState.ts
│   │   └── Faction.ts
│   ├── entities/
│   │   ├── Region.ts
│   │   └── TurnAction.ts
│   ├── values/
│   │   ├── TurnNumber.ts
│   │   ├── TurnSeed.ts
│   │   ├── FixedPointResourcePool.ts
│   │   └── LLMNarrative.ts
│   └── services/
│       └── PRNGService.ts                  # Mulberry32 Engine
│
├── application/                            # Application Use Cases & Interface Contracts
│   ├── ports/
│   │   ├── IGameApplicationService.ts
│   │   ├── IPersistencePort.ts
│   │   ├── ILLMProviderPort.ts
│   │   └── IRendererPort.ts
│   ├── dtos/
│   │   ├── GameStateDTO.ts
│   │   └── TurnCommandDTO.ts
│   └── usecases/
│       ├── StartGameUseCase.ts
│       └── ProcessTurnUseCase.ts
│
├── infrastructure/                         # Driven Adapters
│   ├── persistence/
│   │   ├── IndexedDBStorageAdapter.ts
│   │   └── MemoryStorageAdapter.ts
│   ├── llm/
│   │   ├── FetchCustomLLMAdapter.ts
│   │   └── MockLLMAdapter.ts
│   └── rendering/
│       └── PixiJSCanvasAdapter.ts
│
└── presentation/                           # Driving Adapters & Composition Root
    ├── components/                         # React View Components
    │   ├── GameControlPanel.tsx
    │   ├── RegionViewPanel.tsx
    │   └── LLMNarrativePanel.tsx
    └── main.ts                             # Composition Root Wiring
```
