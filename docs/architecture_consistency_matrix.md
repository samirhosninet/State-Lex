# Shadow State — Architecture Consistency Matrix

**Project**: Shadow State (Browser-Only Geopolitical Strategy Simulation MVP)  
**Document Status**: Ratified Architecture Evidence  

---

| Naming Dimension | Canonical Specification | Target Folder / Interface | Verified Status | Duplicate Aliases Found | Conflict Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Domain Layer** | Pure Domain Core | `src/domain/` | **PASSED** | None | 0 Conflicts |
| **Application Layer** | Use Cases & Ports | `src/application/` | **PASSED** | None | 0 Conflicts |
| **Infrastructure Layer** | Driven Adapters | `src/infrastructure/` | **PASSED** | None | 0 Conflicts |
| **Presentation Layer** | Driving Adapters & UI | `src/presentation/` | **PASSED** | None | 0 Conflicts |
| **Primary Port** | `IGameApplicationService` | `docs/port_contracts.md` | **PASSED** | None | 0 Conflicts |
| **Persistence Port** | `IPersistencePort` | `docs/port_contracts.md` | **PASSED** | None | 0 Conflicts |
| **LLM Provider Port** | `ILLMProviderPort` | `docs/port_contracts.md` | **PASSED** | None | 0 Conflicts |
| **Renderer Port** | `IRendererPort` | `docs/port_contracts.md` | **PASSED** | None | 0 Conflicts |
| **PRNG Engine** | Mulberry32 PRNG | `src/domain/services/` | **PASSED** | None | 0 Conflicts |
| **Resource Math** | `FixedPointResourcePool` | `src/domain/values/` | **PASSED** | None | 0 Conflicts |

*Consistency Audit Result*: Zero aliases, zero duplicates, zero conflicting interface signatures verified across all governing artifacts.
