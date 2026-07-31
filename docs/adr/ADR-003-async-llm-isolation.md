# ADR-003: Asynchronous Read-Only LLM Narrative Isolation

## Status
Ratified & Frozen (Mandatory)

## Context
LLM network requests introduce non-deterministic latencies (500ms to 5000ms+), network failures, and potential prompt injection risks if LLM outputs are allowed to modify domain state.

## Decision
1. **Read-Only Narrative**: LLM integration (`ILLMProviderPort`) generates qualitative text (`LLMNarrative`) for presentation only. LLMs cannot mutate `GameState` aggregates.
2. **Circuit Breaker**: External HTTP requests enforce a strict 3000ms timeout with automatic failover to `MockLLMAdapter`.
3. **Turn Tagging (Mandate M-02)**: Every `LLMNarrative` carries an immutable `TurnNumber` tag. The UI drops any narrative response where `narrative.turnNumber < currentTurn`.

## Consequences
- **Positive**: Game simulation engine proceeds synchronously without blocking on LLM network calls.
- **Negative**: Narrative text may occasionally display local mock fallbacks during network congestion.
