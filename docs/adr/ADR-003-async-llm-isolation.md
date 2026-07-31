# ADR-003: Asynchronous Read-Only LLM Narrative Isolation

## Status
Ratified & Frozen (Mandatory)

## Context
LLM network requests introduce non-deterministic latencies (500ms to 5000ms+), network failures, and potential prompt injection risks if LLM outputs are allowed to modify domain state.

## Decision
1. **Read-Only Narrative**: LLM integration (`ILLMProviderPort`) generates qualitative text (`LLMNarrative`) for presentation only. LLMs cannot mutate `GameState` aggregates.
2. **Circuit Breaker**: External HTTP requests enforce a strict 3000ms timeout with automatic failover to `MockLLMAdapter`.
3. **Turn Tagging (Mandate M-02)**: Every `LLMNarrative` carries an immutable `TurnNumber` tag. The UI drops any narrative response where `narrative.turnNumber < currentTurn`.

## Alternatives Considered
- **Synchronous LLM Simulation Ticks**: Rejected. Blocking turn resolution on external HTTP calls destroys UI responsiveness.
- **Direct LLM State Mutation**: Rejected due to non-deterministic game outcomes and security vulnerabilities.

## Implementation Constraints
- LLM response DTOs must carry `turnNumber: number` for stale response drop verification.
- 3000ms circuit breaker timeout must be enforced in `FetchCustomLLMAdapter`.

## Consequences
- **Positive**: Game simulation engine proceeds synchronously without blocking on LLM network calls.
- **Negative**: Narrative text may occasionally display local mock fallbacks during network congestion.

## Risk & Mitigations
- **Risk**: Out-of-order API responses rendering stale turn commentary.
- **Mitigation**: UI discards any `LLMNarrative` where `narrative.turnNumber < currentTurn`.
