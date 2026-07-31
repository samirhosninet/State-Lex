# Shadow State — Failure Mode & Effects Analysis (FMEA)

**Project**: Shadow State (Browser-Only Geopolitical Strategy Simulation MVP)  
**Document Status**: Ratified Architecture Evidence  

---

## FMEA Risk & Severity Analysis Matrix

| Subsystem | Potential Failure Mode | Potential Root Cause | Potential Effect | Detection Method | Mitigation Strategy | Severity (S) | Occurrence (O) | Detection (D) | RPN (S×O×D) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Persistence Engine** | IndexedDB Storage Full / Quota Exceeded | User in Incognito mode or disk full | Save state write fails | `DOMException` catch block in adapter | Switch to `MemoryStorageAdapter` (**ADR-005**) | 7 | 3 | 2 | **42** |
| **LLM Provider** | API Timeout / Network Hang (> 3000ms) | Poor internet connection or API outage | UI narrative text panel hangs | 3-second `AbortController` signal | Circuit breaker falls back to `MockLLMAdapter` (**ADR-003**) | 4 | 4 | 2 | **32** |
| **LLM Provider** | Stale Narrative Display | Network delay returns turn 2 text during turn 4 | Narrative mismatch with game state | `TurnNumber` validation tag comparison | UI drops narrative if `turnNumber < currentTurn` (**M-02**) | 5 | 3 | 2 | **30** |
| **Simulation Core** | Cross-Browser Float Drift | Rounding differences in JS engines | Simulation desync on long turns | Seeded PRNG replay hash mismatch | Use `FixedPointResourcePool` `BigInt` math (**ADR-004**) | 8 | 3 | 2 | **48** |
| **Simulation Core** | Non-Deterministic Event Execution | Developer calls `Math.random()` | Replay fails to match original run | AST Fitness Linter Rule (**FF-01**) | Enforce AST static analysis rule (**M-01**) | 8 | 2 | 2 | **32** |

---

## Risk Priority Number (RPN) Summary
All identified RPN scores are below 50 due to proactive architectural mitigations (ADR-001 through ADR-005).
