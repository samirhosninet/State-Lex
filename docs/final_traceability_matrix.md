# Shadow State — Final Traceability Matrix (v1.1 Baseline)

**Project**: Shadow State (Browser-Only Geopolitical Strategy Simulation MVP)  
**Document Status**: Single Source of Truth Traceability Matrix  

---

| Requirement ID | Requirement Description | ADR / Mandate | Domain Rule | Port Contract | Task ID | Automated Fitness Function |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-01** | Browser-Only Runtime | ADR-001 | Pure ES Domain Isolation | `IGameApplicationService` | `TASK-001`, `TASK-016` | `test:bundle-isolation` |
| **REQ-02** | Seed-Based Determinism | ADR-002 | Mulberry32 PRNG Algorithm | `IGameApplicationService` | `TASK-005`, `TASK-017` | `test:determinism` |
| **REQ-03** | Fixed-Point Resource Math | ADR-004 | BigInt Scaled Base Units | `IGameApplicationService` | `TASK-004` | `test:fixed-point` |
| **REQ-04** | Pure Domain Isolation | Mandate M-01 | Zero Framework Imports | N/A (Core Layer) | `TASK-002`, `TASK-021` | `test:fitness-purity` |
| **REQ-05** | Atomic Persistence | ADR-005 | `.tmp` Key Swap & Memory Fallback | `IPersistencePort` | `TASK-012`, `TASK-018` | `test:storage-atomic` |
| **REQ-06** | Async LLM Isolation | Mandate M-02 & ADR-003 | 3s Timeout & Immutable `TurnNumber` | `ILLMProviderPort` | `TASK-013`, `TASK-019` | `test:llm-isolation` |
| **REQ-07** | Decoupled PixiJS Canvas | ADR-001 | El Alamein & Ras El Hekma Render | `IRendererPort` | `TASK-014` | `test:render-decoupling` |
| **REQ-08** | React UI Controls | ADR-001 | Passive View Component Dispatch | `IGameApplicationService` | `TASK-015` | `test:ui-decoupling` |

*Traceability Status*: 100% of requirements map directly to ADRs, domain rules, ports, tasks, and automated fitness functions. Zero broken chains.
