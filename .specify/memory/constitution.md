# Browser-Only Geopolitical Strategy Simulation MVP Constitution

## Core Purpose & Governing Status
This document constitutes the supreme governing law for the **Browser-Only Geopolitical Strategy Simulation MVP**. All future feature specifications (`/speckit.specify`), architectural plans (`/speckit.plan`), task breakdowns (`/speckit.tasks`), and code implementations (`/speckit.implement`) MUST strictly align with and conform to the principles and constraints established herein.

---

## Non-Negotiable Phase Gate Directive

> [!CRITICAL]
> **ARCHITECTURE-FIRST MANDATE & HARD PHASE GATE**
> 
> 1. **Architecture Before Code**: Architecture and design decisions strictly precede implementation.
> 2. **Zero Code Rule in Architecture Phase**: The AI agent and developers are **EXPLICITLY FORBIDDEN** from generating production code, boilerplate, or feature logic during the architecture phase.
> 3. **No Implementation Without Approval**: No production code shall be written or generated until formal Architecture Review, Premortem Review, and Red Team Review approvals are completed and documented.

---

## Core Architectural Principles

### 1. Architecture-First & MVP-First Focus
- **Architecture over Implementation**: Structural clarity, abstraction boundaries, and system design take precedence over rapid code generation.
- **MVP Scoping**: Focus exclusively on core geopolitical simulation mechanics required for a viable minimum product. Avoid premature feature sprawl or speculative scope additions.

### 2. Execution & Storage Constraints
- **Browser-Only Execution**: The entire simulation and application logic must execute inside client-side web browsers without relying on server-side runtime infrastructure.
- **Local-First Persistence**: State, saves, and configuration must persist locally on the client (e.g., IndexedDB / LocalStorage) with full offline availability.

### 3. Simulation Integrity & Determinism
- **Pure Deterministic Simulation**: The core simulation engine must be 100% deterministic given identical initial state seeds and inputs.
- **Single Source of Truth**: System state exists in exactly one canonical location managed strictly by the Domain Model.

### 4. Structural Design & Boundaries
- **Hexagonal Architecture (Ports & Adapters)**: The domain logic communicates with external systems (rendering, storage, UI, LLM) exclusively through explicit interface ports.
- **Clean Architecture Boundaries**: Core business logic has zero upward dependencies on outer layers (adapters, frameworks, or drivers).
- **Dependency Inversion Principle**: High-level simulation modules must not depend on low-level UI or platform modules. Both must depend on abstractions.
- **Pure Domain Model**: The domain core must be written in pure language constructs with **zero** dependencies on DOM, browser APIs, UI frameworks, or third-party libraries.

### 5. Modularity & Swappable Components
The system design must enforce pluggable, easily swappable implementations via port interfaces for:
- **Replaceable Rendering Engine**: Canvas, WebGL, SVG, or DOM-based renderers behind a unified rendering port.
- **Replaceable LLM Provider**: Local in-browser models, WebLLM, external API proxies, or mock providers behind an LLM port.
- **Replaceable Persistence Layer**: IndexedDB, LocalStorage, file export/import, or memory adapter behind a storage port.
- **Replaceable UI Framework**: React, Vue, Svelte, or Vanilla Web Components behind UI bindings and state ports.

### 6. Engineering Standards
- **Minimal Dependencies**: Minimize third-party package dependencies. Every external dependency must be justified by an ADR.
- **Performance-Conscious Design**: Memory allocation, simulation loop execution, and state diffing must be designed for smooth browser performance.
- **Security by Design**: Enforce local data isolation, input validation, and secure handling of optional API credentials or external inputs.
- **Testability by Design**: Every domain entity, value object, port, and simulation tick must be independently testable without UI or browser mocks.

---

## Mandatory Pre-Implementation Quality Gates

Before any production code implementation begins, the project MUST pass and document the following three mandatory reviews:

1. **Explicit ADRs (Architectural Decision Records)**: Every major structural choice, framework selection, or design pattern must be documented in a dedicated ADR detailing context, options, decision, and consequences.
2. **Mandatory Premortem Review**: A formal premortem analysis identifying potential failure modes, performance bottlenecks, edge-case failures, and architectural weaknesses before code is written.
3. **Mandatory Red Team Review**: A security, determinism, and architectural boundary review to stress-test the proposed architecture against violations of Hexagonal boundaries, non-determinism, or coupling.
4. **Architecture Review Approval**: Formal sign-off on the completed `/speckit.plan` and architectural artifacts confirming total compliance with this Constitution.

---

## Governance & Compliance

- **Supremacy Clause**: This Constitution supersedes all informal discussions, ad-hoc requirements, or agent prompts.
- **Violation Policy**: Any pull request or code change that violates Hexagonal boundaries, introduces non-deterministic domain behavior, or bypasses the architecture phase gate shall be rejected automatically.
- **Amendments**: Modifications to this Constitution require explicit documentation, impact assessment, and formal approval.

---
**Version**: 1.0.0 | **Status**: Ratified & Active
