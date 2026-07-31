# ADR-004: Mandatory Fixed-Point Integer Arithmetic

## Status
Ratified & Frozen (Mandatory)

## Context
IEEE 754 floating-point arithmetic (JS standard `Number`) accumulates subtle rounding discrepancies across different JS engines and architectures during complex resource calculations.

## Decision
All domain resource pools (`FixedPointResourcePool`) use scaled `BigInt` integer representations (where 1 resource unit = 100 base units). Floating-point arithmetic is strictly prohibited in `src/domain/`.

## Alternatives Considered
- **Standard JS `Number` Floats**: Rejected due to non-deterministic rounding errors across V8 and SpiderMonkey.
- **Third-Party Decimal Libraries**: Rejected to avoid external runtime dependencies in `src/domain/`.

## Implementation Constraints
- Native `BigInt` arithmetic only (`+`, `-`, `*`).
- Serialization to IndexedDB requires string conversion (`"10000n"`) in DTO mappers (**ADR-005**).

## Consequences
- **Positive**: 0.0 floating-point rounding drift across JS runtimes.
- **Negative**: Requires explicit DTO mapping between `BigInt` domain units and serialized JSON strings for IndexedDB persistence.

## Risk & Mitigations
- **Risk**: `JSON.stringify()` throwing `TypeError` on native `BigInt`.
- **Mitigation**: Application DTO mappers convert `BigInt` properties to string representations prior to JSON serialization.
