# ADR-001: Hexagonal (Ports & Adapters) Architecture

## Status
Ratified & Frozen (Mandatory)

## Context
Shadow State requires strict separation between core geopolitical simulation domain logic and outer technical concerns (React UI, PixiJS map canvas, IndexedDB storage, external LLM APIs).

## Decision
The system architecture strictly enforces **Hexagonal (Ports & Adapters) Architecture**:
1. **Core Domain (`src/domain/`)**: Pure ES TypeScript logic with ZERO external dependencies or framework imports.
2. **Application Layer (`src/application/`)**: Application use cases (`ProcessTurnUseCase`, `StartGameUseCase`) and port interface contracts (`IGameApplicationService`, `IPersistencePort`, `ILLMProviderPort`, `IRendererPort`).
3. **Infrastructure Layer (`src/infrastructure/`)**: Driven adapters (`IndexedDBStorageAdapter`, `FetchCustomLLMAdapter`, `MockLLMAdapter`, `PixiJSCanvasAdapter`).
4. **Presentation Layer (`src/presentation/`)**: Driving adapters (React UI components and `main.ts` Composition Root).

## Consequences
- **Positive**: 100% of domain logic is unit testable without DOM or browser dependencies; adapters are fully replaceable.
- **Negative**: Requires explicit DTO mapping between infrastructure adapters and pure domain entities.
