# ADR-002: Seed-Based Deterministic PRNG Engine

## Status
Ratified & Frozen (Mandatory)

## Context
Cross-browser JavaScript engines (V8 in Chrome/Edge, SpiderMonkey in Firefox, JavaScriptCore in Safari) implement `Math.random()` differently, breaking turn replayability and simulation determinism.

## Decision
The core domain engine bans browser `Math.random()` completely (**Mandate M-01**) and utilizes a pure 32-bit **Mulberry32 PRNG** algorithm initialized per session via a 32-bit `TurnSeed` value object.

## Alternatives Considered
- **Native `Math.random()`**: Rejected due to non-deterministic PRNG implementations across browser engines.
- **Crypto.getRandomValues()**: Rejected because cryptographic randomness cannot be seeded for deterministic turn replay.

## Implementation Constraints
- PRNG state must be seeded deterministically via `TurnSeed + TurnNumber`.
- Random values must be scaled to integer ranges (`Math.floor(prng() * range)`) to prevent float rounding drift.

## Consequences
- **Positive**: 100% deterministic simulation ticks; identical seeds produce identical state hashes across all browsers.
- **Negative**: Random events must strictly consume PRNG state through domain methods.

## Risk & Mitigations
- **Risk**: Floating-point drift during PRNG scaling.
- **Mitigation**: Pure integer bitwise arithmetic (`Math.imul` and `>>> 0`) for state mutation.
