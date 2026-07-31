# Shadow State — Decision Coverage Report

**Project**: Shadow State (Browser-Only Geopolitical Strategy Simulation MVP)  
**Document Status**: ADR Coverage Verification Evidence  

---

| ADR ID | Title | Standalone File | Alternatives Evaluated | Trade-offs Documented | Rationale Provided | Decision Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ADR-001** | Hexagonal Architecture | `docs/adr/ADR-001...` | Layered Architecture, Feature Folders | DTO mapping overhead vs Domain testability | High domain purity | **RATIFIED** |
| **ADR-002** | Seed-Based PRNG Engine | `docs/adr/ADR-002...` | Native `Math.random()`, PCG32 | Seed overhead vs Cross-browser replayability | Replay determinism | **RATIFIED** |
| **ADR-003** | Async LLM Isolation | `docs/adr/ADR-003...` | Synchronous LLM, Client Rule Engines | Network delay vs Narrative richness | Read-only safety | **RATIFIED** |
| **ADR-004** | Fixed-Point Resource Math | `docs/adr/ADR-004...` | Floating-point `Number`, Decimal.js | Serialization overhead vs IEEE 754 float drift | 0 float desync | **RATIFIED** |
| **ADR-005** | Atomic Persistence Writes | `docs/adr/ADR-005...` | Direct LocalStorage write | Storage quota risk vs Crash resilience | Atomic swap safety | **RATIFIED** |

*Coverage Audit Result*: 100% of architectural decisions possess standalone ADR documents with alternatives, trade-offs, and rationale.
