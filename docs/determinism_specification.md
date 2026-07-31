# Shadow State — Determinism System Specification

**Project**: Shadow State (Browser-Only Geopolitical Strategy Simulation MVP)  
**Document Status**: Ratified Determinism Specification (**ADR-002** & **ADR-004**)  

---

> [!IMPORTANT]
> ### DETERMINISM SPECIFICATION NOTICE
> This document specifies the mathematical and algorithmic design required for 100% turn determinism.
> 
> **Status**: `SPECIFIED IN DOCUMENTATION / UNVERIFIED UNTIL CODE IMPLEMENTATION`.

---

## 1. Seeded PRNG Algorithm (Mulberry32)

To eliminate cross-browser `Math.random()` discrepancies (**Mandate M-01**), random turn events consume a pure 32-bit **Mulberry32 PRNG**:

```typescript
// Pure 32-bit Mulberry32 PRNG Algorithm Specification
export function mulberry32(a: number): () => number {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

---

## 2. Seed Lifecycle & Replay Determinism

1. **Initialization**: Game session starts with a 32-bit `TurnSeed` value object (e.g. `0xDEADBEEF`).
2. **Turn Execution**: `ProcessTurnUseCase` initializes the PRNG state using `TurnSeed + TurnNumber`.
3. **Replayability**: Re-executing the turn action log with the initial `TurnSeed` yields identical state hashes across V8, SpiderMonkey, and JavaScriptCore engines.

---

## 3. Cross-Browser Fixed-Point Math Assumptions

- All resource calculations use scaled `BigInt` integers (**ADR-004**).
- Eliminates IEEE 754 floating-point rounding discrepancies across operating systems (Windows, macOS, Linux, Android, iOS).

---

## 4. Verification Strategy (Specification Only)

- **Test Rule**: `test:determinism` in `TASK-017` will execute 500 consecutive turn ticks across 3 distinct seeds and assert 100% state hash identity.
