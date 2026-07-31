# Shadow State — Master Architecture Risk Register

**Project**: Shadow State (Browser-Only Geopolitical Strategy Simulation MVP)  
**Document Status**: Ratified Risk Register Evidence  

---

| Risk ID | Category | Risk Description | Likelihood | Impact | Proposed Mitigation | Task ID | Owner | Residual Risk | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AR-01** | Determinism | Developer imports `Math.random()` in domain core | Medium | High | Automated AST Fitness Linter Rule (**M-01**) | `TASK-002`, `TASK-021` | Lead Architect | **LOW** | **MITIGATED** |
| **AR-02** | Security | Stale LLM narrative overwrites current turn | Low | Medium | Immutable `TurnNumber` validation tag (**M-02**) | `TASK-013`, `TASK-019` | Security Architect | **LOW** | **MITIGATED** |
| **AR-03** | Precision | IEEE 754 floating-point drift across JS engines | Medium | Medium | Fixed-Point Integer Math (**ADR-004**) | `TASK-004` | Systems Engineer | **LOW** | **MITIGATED** |
| **AR-04** | Storage | IndexedDB quota full or Incognito block | Low | Medium | Atomic write swap & Memory Fallback (**ADR-005**) | `TASK-012`, `TASK-018` | Storage Architect | **LOW** | **MITIGATED** |
