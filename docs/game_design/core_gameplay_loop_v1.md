# core_gameplay_loop_v1.md

```
Document Type: Implementation Specification
Derived From: TASK-015-Hypothesis.md v0.9.2
Status: APPROVED FOR IMPLEMENTATION
Version: v1.0.5
```

This document contains **zero new design decisions**. Every mechanic below exists to
implement the hypothesis frozen in `TASK-015-Hypothesis.md`. If you are reading this
and thinking "what if we also added X," stop — write it in the v0.1+ backlog
(Section 8) and continue implementing this spec unchanged.

---

## 1. Purpose

Implement the v0 Vertical Slice defined in `TASK-015-Hypothesis.md` (FROZEN v0.9.1) —
and nothing beyond it. This document is a **specification**, not a design
exploration. Any ambiguity found while building should be resolved by re-reading the
frozen brief, not by inventing new mechanics here.

---

## 2. Player Loop

One turn, start to finish:

```
Observe
   ↓  (current allocation state + visible Trust states for all 5 actors)
Allocate
   ↓  (player moves capacity between actors — every gain is funded by a loss elsewhere)
Confirm
   ↓  (end-turn action — this IS the Decision Unit, per TASK-015 §4)
Resolve
   ↓  (engine applies matrix effects, updates Trust, checks Rule Mutation trigger)
Feedback
   ↓  (player sees what changed and why — Trust state deltas, any triggered events)
Next Turn
```

No branching, no optional sub-loops, no additional player-facing systems. This loop
runs identically for all 20 turns except for the one Rule Mutation trigger point.

---

## 3. Turn Lifecycle (execution order)

Each turn executes in this fixed order:

1. **Input** — player submits one allocation change (source actor, target actor, amount)
2. **Validation** — reject if: amount exceeds source actor's current allocation,
   target/source actor doesn't exist, or capacity total ≠ 100 after the move
3. **State Update** — apply the allocation change to the 5-actor pool
4. **Matrix Application** — apply the fixed influence matrix (see
   `TASK-015-Hypothesis.md` Appendix) to compute Trust deltas for all actors based on
   the new allocation. **Formula (fixed):** `trust_delta[actor] = allocation[source_actor]
   × edge_weight[source_actor][actor]`, evaluated against the *current absolute
   allocation value* after the transfer — not against the size of the move itself.
   This means Trust effects are recomputed from the full allocation state every
   turn, not accumulated from deltas. (This resolves the two possible readings of
   "how raising allocation shifts trust" — the absolute-state reading is the one
   this spec implements.)

   **Trust Update Formula (fixed — persistence semantics):** the *matrix effect* is
   recomputed from absolute allocation state each turn, but the **Trust score itself
   persists across turns** and accumulates that effect. Concretely:
   ```
   raw_delta[actor] = Σ over all source actors of
                       ( allocation[source_actor] × edge_weight[source_actor][actor] )

   new_internal_score[actor] = clamp(
       previous_internal_score[actor] + raw_delta[actor],
       0, 100
   )
   ```
   Trust state transitions (Section 4.2) are evaluated only *after* this update, using
   `new_internal_score`. This is Interpretation A, not B: allocation effects are not
   accumulated turn-over-turn (they're recalculated from the current state), but the
   resulting Trust score has memory — it is not reset or recomputed from scratch each
   turn. Without this persistence, the Neglect Counter and Hysteresis in Section 4.2
   would have no meaningful state to act on.
5. **Trust Update** — update each actor's internal Trust score; evaluate hysteresis
   bounds; update visible state (`Healthy / Unstable / Hostile`) only if a threshold
   is crossed
6. **Apply Scheduled World Changes** — if current turn == 11, apply the single
   scripted matrix edge change (see Section 4.3); record to `world_changes[]`
7. **Resolve Consequences** — for any actor below its lower threshold for 3
   consecutive turns, trigger the scripted negative consequence tied to that actor;
   record to `consequences[]`. This order (world changes before consequences)
   ensures that if both occur on the same turn, telemetry cleanly separates which
   caused which — critical for interpreting player reactions on Turn 11.
8. **Telemetry** — record the full Decision Unit record (Section 6) before advancing
9. **End Turn** — advance turn counter; if turn == 20, end slice and export data

---

## 4. Systems Specification

### 4.1 Influence Allocation

- Fixed pool: **100**, split across the 5 actors (State Administration, Investors,
  Security Establishment, Local Communities, Media)
- Every reallocation is a transfer: capacity removed from one actor must be added to
  another in the same action. No allocation action may create or destroy capacity.
- Starting distribution is even (20 per actor) unless a specific starting scenario is
  defined separately — this spec does not define narrative framing, only the
  mechanical starting state.
- **Balance Gate (testable form):** each of the 5 actors shall be the optimal
  allocation target in at least one authored validation scenario. Five fixed
  validation scenarios (one per actor) must be authored and checked against the
  matrix before playtesting — this replaces the non-testable "realistic situation"
  language from `TASK-015-Hypothesis.md` with a concrete pass/fail check.
- **"Optimal" definition:** produces the highest immediate strategic value according
  to that scenario's authored objective evaluator — **not** the highest raw Trust
  gain. Each of the 5 validation scenarios must define its own objective (e.g.
  "avoid a Hostile state on Actor X within 3 turns," not "maximize Trust score"), so
  a test can't be satisfied by trivially maximizing one number.

### 4.1a Engine Mathematical Contract

This section fixes the invariants the formula in Section 3 step 4 must run under —
determinism, validation, and operation order. It does **not** choose a numeric
representation or a balance range: those are, respectively, an implementation
decision (Milestone 1 step 0, `TASK-015-Implementation-Breakdown.md` §5) and a
balance decision (`balance_config_v0.json` / the matrix data file). Keeping this
section to invariants only means a future balance change to the weight range, or an
implementation change to how numbers are represented, never requires reopening this
spec.

- **`edge_weight` domain:** each entry in the 5×5 influence matrix belongs to a
  **finite, signed numeric domain declared by the matrix schema** (i.e. the schema
  the matrix data file validates against) — not a value hardcoded in this document.
  The engine **MUST** reject, at load time, any matrix whose weights fall outside
  the domain its own schema declares. What that domain's actual bounds are (e.g.
  `[-1.0, 1.0]` vs. some other range) is a balance decision made in the matrix data
  file, not an engine contract decision.
- **No implicit normalization:** rows and columns of the matrix are **not**
  required to sum to any fixed value. Each edge weight is authored independently
  within the schema-declared domain above.
- **Deterministic representation (representation-neutral):** all allocation,
  Trust, and matrix arithmetic **MUST** be bit-identical across runs and
  environments given the same inputs — same rounding point, same rounding rule,
  same operation order. This document does not decide the underlying numeric
  representation (decimal, fixed-point, scaled integer, or otherwise); that choice
  is made once, by the Deterministic Math Layer, and is binding on every component
  built after it (`TASK-015-Implementation-Breakdown.md` §5, Milestone 1 step 0).
  Rounding is applied **after** each full formula evaluation in Section 3 step 4 —
  never mid-formula.
- **Clamp ordering:** `clamp(previous_internal_score[actor] + raw_delta[actor], 0,
  100)` is applied once per actor per turn, after `raw_delta` is fully summed
  across all five source actors — never clamped per-source-actor before summing.

Guidance on what magnitude of `raw_delta` makes hysteresis thresholds meaningful is
a balancing concern, not an engine invariant — it lives in Balance Validation
(`TASK-015-Implementation-Breakdown.md` §4), not here.

### 4.2 Trust State Machine

- Each actor holds one internal numeric Trust score (0–100). **Initial values are not
  defined in this spec** — they live in `balance_config_v0.json` (a separate,
  adjustable config file), keeping the simulation core deterministic while balance
  stays tunable without touching this document or the code. Example shape:
  ```json
  {
    "initialTrust": {
      "StateAdministration": 50,
      "Investors": 50,
      "SecurityEstablishment": 50,
      "LocalCommunities": 50,
      "Media": 50
    }
  }
  ```
- Visible state is one of three values only: `Healthy`, `Unstable`, `Hostile`
- State transitions use **hysteresis**: the entry threshold into a lower state and
  the exit threshold back into a higher state are different values, to prevent
  flicker. Exact numbers belong to balancing, not to this spec.
- Neglect consequence: an actor below its lower threshold for 3 consecutive turns
  triggers one scripted negative event tied to that actor. These 5 events (one per
  actor) must exist but are content, not mechanics — write them in
  `docs/game_design/core_loop_events_v0.md` (separate content file, not part of this
  spec).
- **Idempotency rule:** each actor's Neglect Consequence may trigger only **once per
  playthrough**. If the same actor drops below threshold again later in the same
  20-turn slice, no second trigger fires. This is a fixed rule for v0 — retriggering
  after recovery is out of scope (see Section 8 backlog).

### 4.3 Rule Mutation

- Exactly one mutation event, scheduled at **Turn 11 (fixed)** — not a range, not
  randomized, per `TASK-015-Hypothesis.md` v0.9.1
- Effect: **modifies the weight of exactly one existing edge** in the fixed
  influence matrix (e.g. Government → Investors effect strength changes)
- **Timing (non-retroactive):** the mutation is applied during the Turn 11 "Apply
  Scheduled World Changes" step, *after* that turn's Matrix Application and Trust
  Update have already resolved using the pre-mutation weights. Rule Mutation affects
  calculations from **Turn 12 onward only** — it does not retroactively modify Turn
  11's resolution. The player is never scored against a rule that didn't exist yet
  when they made that turn's decision.
- Hard constraints (per TASK-015 §4): this event **MUST NOT**:
  - introduce a 6th actor
  - introduce a new mechanic
  - introduce a new resource
  - introduce new UI
- The mutation is guaranteed to occur — it is not conditional on player behavior.

### 4.4 End of Slice

- At turn 20, the slice ends unconditionally. There is no win/loss state in v0 —
  TASK-015 does not test victory conditions, only decision quality. Do not implement
  a win/loss screen; implement an end-of-slice summary screen only (final allocation,
  final Trust states, full turn history).

---

## 5. UI Contract (player-facing surface only — no implementation detail)

The player must be able to see, at all times:

- Current allocation per actor (5 values, sum = 100)
- Current Trust state per actor (`Healthy / Unstable / Hostile` — never the raw number)
- Pending allocation change before confirming
- Turn counter (current / 20)

The player must be shown, after each Confirm:

- What changed (allocation deltas, Trust state changes)
- Whether a Rule Mutation occurred this turn, and what changed if so

No other UI surface is in scope for v0.

---

## 6. Telemetry Contract

Every Decision Unit (Section 2) must produce a record containing:

| Field | Description |
|---|---|
| `session_seed` | fixed identifier for the playtest session, recorded even though v0 has no RNG — ensures the schema is ready if randomness is introduced later |
| `turn_number` | 1–20 |
| `allocation_before` | snapshot of all 5 actor values pre-move |
| `allocation_after` | snapshot of all 5 actor values post-move |
| `allocation_delta` | source actor, target actor, amount moved |
| `trust_states_before` | 5 actor states pre-resolve, **in fixed actor order** (Section 4.1 vector order) |
| `trust_states_after` | 5 actor states post-resolve, **in fixed actor order** — same constraint as `allocation_after`: no alphabetical or ID-based reordering |
| `rule_mutation_triggered` | boolean |
| `world_changes[]` | list of scheduled world changes applied this turn (empty unless turn == 11) |
| `consequences[]` | list of Neglect Consequences triggered this turn, resolved *after* `world_changes[]` (Section 3, step 7) |
| `time_to_decision` | wall-clock time between turn start and Confirm |

**Allocation Pattern (definition):** the complete post-confirm allocation vector
across all five actors — e.g. `(25, 15, 20, 25, 15)` — not the delta of a single
move. Decision Diversity (TASK-015 §7) is computed by comparing Allocation Patterns
across turns and across playtest participants.

**Fixed vector order (mandatory):**

```
[
  State Administration,
  Investors,
  Security Establishment,
  Local Communities,
  Media
]
```

All `allocation_after` / `allocation_before` records and all Allocation Pattern
comparisons must use this exact order. No alphabetical or ID-based reordering.

**Decision Diversity — Metric Formula:**

```
For each playtest cohort:
  1. Record every unique allocation_after vector (Allocation Pattern) produced
     across all Decision Units in the cohort.
  2. Count the frequency of each unique pattern.
  3. Dominance Ratio = frequency of the most common pattern / total Decision Units
     in the cohort.

Pass:  Dominance Ratio <= 0.60
Fail:  Dominance Ratio >  0.60
```

This must be computed automatically from `allocation_after` (the Allocation Pattern)
across all recorded turns and all playtest participants — no manual data processing
permitted, per Exit Criteria.

---

## 7. Acceptance Mapping

| Exit Criteria item (TASK-015 §11) | Verified by |
|---|---|
| 20-turn playable slice exists | Manual playthrough, turn counter reaches 20 |
| All five actors are represented | UI Contract Section 5 checklist |
| Allocation UI is functional | Manual QA of Allocate → Confirm flow |
| Trust states are visible | UI Contract Section 5 checklist |
| Rule Mutation occurs exactly once | `rule_mutation_triggered` = true exactly once per telemetry log |
| Telemetry records every Decision Unit | Row count in telemetry log == number of Confirm actions |
| Decision Diversity metric is automatically computed | Automated report generated from the Allocation Pattern (`allocation_after` field), no manual step |
| Playtest data can be exported without manual processing | Telemetry log exports to a flat file/table directly from the record schema in Section 6 |

---

## 8. Out-of-Scope Enforcement

Implementation **MUST NOT** introduce any of the following, regardless of how small
the change appears during implementation. If any of these seem necessary to make v0
"work better," that is a signal the v0 hypothesis itself failed — not a reason to add
scope. File a backlog item instead.

- Trust Memory (history of past neglect/favor)
- Expected Allocation thresholds held privately by actors
- Reputation layers beyond the 3-state Trust
- Relationship histories between actors independent of the player
- Adaptive or reactive AI behavior per actor
- Dynamic, continuously-evolving network weights
- Any political/rights/constitutional simulation layer
- A 6th actor
- More than one Rule Mutation event
- A win/loss condition or victory screen

### Backlog (for reference only — not to be built now)

| Idea | Target version |
|---|---|
| Dynamic, continuously evolving network weights | v0.1 |
| Trust Memory | v0.2 |
| Adaptive, actor-driven relationships | v0.3 |

---

## 9. Non-Goals (inherited from TASK-015 §9)

This implementation does not need to demonstrate historical realism, political
realism, AI quality, campaign longevity, or replayability beyond the 20-turn slice.
Feedback on these dimensions during playtest should be logged separately and does not
block Exit Criteria sign-off.
