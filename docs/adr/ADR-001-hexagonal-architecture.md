# ADR-001: Hexagonal (Ports & Adapters) Architecture

## Status
Ratified & Frozen (Mandatory)

## Context
Shadow State requires strict separation between core geopolitical simulation domain logic and outer technical concerns (React UI, PixiJS map canvas, IndexedDB storage, external LLM APIs).

## Decision
The system architecture strictly enforces **Hexagonal (Ports & Adapters) Architecture**:
1. **Core Domain (`src/domain/`)**: Pure ES TypeScript logic with ZERO external dependencies or framework imports (**Mandate M-01**).
2. **Application Layer (`src/application/`)**: Application use cases (`ProcessTurnUseCase`, `StartGameUseCase`) and port interface contracts (`IGameApplicationService`, `IPersistencePort`, `ILLMProviderPort`, `IRendererPort`).
3. **Infrastructure Layer (`src/infrastructure/`)**: Driven adapters (`IndexedDBStorageAdapter`, `FetchCustomLLMAdapter`, `MockLLMAdapter`, `PixiJSCanvasAdapter`).
4. **Presentation Layer (`src/presentation/`)**: Driving adapters (React UI components and `main.ts` Composition Root).

## Alternatives Considered
- **Monolithic Direct Import Model**: Rejected. Importing UI frameworks directly into simulation classes creates tight coupling and breaks headless testability.
- **Layered N-Tier Architecture**: Rejected. Standard layered models often allow domain logic to leak into database adapters.

## Implementation Constraints
- Zero external imports permitted inside `src/domain/` (enforced by `TASK-002` AST linter fitness function).
- All communication across boundaries must pass through application DTOs.

## Consequences
- **Positive**: 100% of domain logic is unit testable without DOM or browser dependencies; adapters are fully replaceable.
- **Negative**: Requires explicit DTO mapping between infrastructure adapters and pure domain entities.

## Risk & Mitigations
- **Risk**: DTO transformation overhead at layer boundaries.
- **Mitigation**: Pure in-memory DTO mapping functions with minimal heap allocations.
