# ADR-004: Mandatory Fixed-Point Integer Arithmetic

## Status
Ratified & Frozen (Mandatory)

## Context
IEEE 754 floating-point arithmetic (JS standard `Number`) accumulates subtle rounding discrepancies across different JS engines and architectures during complex resource calculations.

## Decision
All domain resource pools (`FixedPointResourcePool`) use scaled `BigInt` integer representations (where 1 resource unit = 100 base units). Floating-point arithmetic is strictly prohibited in `src/domain/`.

## Consequences
- **Positive**: 0.0 floating-point rounding drift across JS runtimes.
- **Negative**: Requires explicit DTO mapping between `BigInt` domain units and serialized JSON strings for IndexedDB persistence.
