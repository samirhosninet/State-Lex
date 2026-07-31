# ADR-002: Seed-Based Deterministic PRNG Engine

## Status
Ratified & Frozen (Mandatory)

## Context
Cross-browser JavaScript engines (V8 in Chrome/Edge, SpiderMonkey in Firefox, JavaScriptCore in Safari) implement `Math.random()` differently, breaking turn replayability and simulation determinism.

## Decision
The core domain engine bans browser `Math.random()` completely (**Mandate M-01**) and utilizes a pure 32-bit **Mulberry32 PRNG** algorithm initialized per session via a 32-bit `TurnSeed` value object.

## Consequences
- **Positive**: 100% deterministic simulation ticks; identical seeds produce identical state hashes across all browsers.
- **Negative**: Random events must strictly consume PRNG state through domain methods.
