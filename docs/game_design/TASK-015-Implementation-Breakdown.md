# TASK-015-Implementation-Breakdown.md

```
Document Type: Implementation Plan
Status: READY FOR ENGINEERING
Derived From:
- TASK-015-Hypothesis.md v0.9.2 (FROZEN)
- core_gameplay_loop_v1.md v1.0.5 (APPROVED IMPLEMENTATION SPEC)
```

This document breaks the approved spec into buildable systems, data models, tests,
and milestones. It introduces **no new design decisions** — every field and
component here traces back to a definition already frozen or approved upstream. If
implementation reveals a genuine gap, resolve it as a Runtime Validation or Balance
Validation finding (Section 6), not as new design.

---

## 1. System Decomposition

### 1.1 Influence System

```
InfluencePool
    │
    ├── AllocationState        (current 5-actor allocation vector, sum == 100)
    ├── TransferValidator      (rejects invalid moves per spec §3 step 2)
    └── AllocationResolver     (applies a validated transfer to AllocationState)
```

### 1.2 Trust System

```
TrustComponent (one instance per actor)
    │
    ├── InternalScore           (0–100, not player-visible; initial values from
    │                              balance_config_v0.json, not hardcoded; persists
    │                              and accumulates across turns per spec §3 step 4 —
    │                              never recomputed from scratch each turn)
    ├── ThresholdEvaluator      (hysteresis entry/exit bounds — values from
    │                              balance_config_v0.json, set at balancing)
    ├── HysteresisStateMachine  (prevents state flicker, per spec §4.2)
    └── VisibleTrustState       (Healthy / Unstable / Hostile only)
```

Explicitly does **not** own: memory, history, or adaptive/AI behavior (spec §8).

### 1.3 Influence Matrix System

```
InfluenceMatrix
    │
    ├── EdgeWeights[5][5]        (fixed, per TASK-015-Hypothesis.md Appendix)
    ├── ApplyAllocationEffects() (trust_delta[actor] = allocation[source] × weight —
    │                              recomputed from absolute allocation state each turn,
    │                              per core_gameplay_loop_v1.md §3 step 4)
    └── ApplyMutation()          (Turn 11 only — edits exactly one edge weight)
```

`ApplyMutation()` is a data mutation only — it changes a number in `EdgeWeights`,
nothing else. It must not be reachable from any other trigger than the fixed Turn 11
check.

### 1.4 Consequence System

```
NeglectTracker (one instance per actor)
    │
    ├── BelowThresholdCounter   (consecutive turns below lower threshold)
    ├── TriggerRegistry         (hasTriggered(actorId) — enforces idempotency, spec §4.2)
    └── ConsequenceEmitter      (fires the scripted event, writes to consequences[])
```

### 1.5 Rule Mutation Scheduler

```
ScheduledWorldEvents
    │
    └── Turn 11 → ApplyMutation() → emit to world_changes[]
```

Runs in Turn Lifecycle step 6 (spec §3), strictly before step 7 (Resolve
Consequences), per the non-retroactive ordering already fixed in v1.0.1.

---

## 2. Core Data Models

```typescript
enum ActorId {
  StateAdministration,
  Investors,
  SecurityEstablishment,
  LocalCommunities,
  Media,
}
// Fixed order — matches the mandatory vector order in core_gameplay_loop_v1.md §6.
// No alphabetical or ID-based reordering anywhere in the codebase.

interface AllocationVector {
  stateAdministration: number;
  investors: number;
  securityEstablishment: number;
  localCommunities: number;
  media: number;
}
// Invariant: sum of all five fields == 100 at all times, enforced by TransferValidator.

enum TrustState {
  Healthy,
  Unstable,
  Hostile,
}

interface TrustSnapshot {
  actor: ActorId;
  state: TrustState;
  // internalScore is never exposed outside TrustComponent / telemetry
}
// TrustSnapshot[] arrays (trust_states_before / trust_states_after) MUST preserve
// the fixed ActorId vector order defined above. AllocationVector has this
// constraint built into its shape (named fields); TrustSnapshot does not, so it
// must be enforced explicitly — do not sort by actor name or ID.

interface WorldChangeRecord {
  turn: number;           // always 11 in v0
  edgeChanged: [ActorId, ActorId];
  previousWeight: number;
  newWeight: number;
}

interface ConsequenceRecord {
  turn: number;
  actor: ActorId;
  eventId: string;        // references docs/game_design/core_loop_events_v0.md
}

interface TurnTelemetry {
  session_seed: string;
  turn_number: number;                    // 1–20
  allocation_before: AllocationVector;
  allocation_after: AllocationVector;
  allocation_delta: {
    source: ActorId;
    target: ActorId;
    amount: number;
  };
  trust_states_before: TrustSnapshot[];   // matches core_gameplay_loop_v1.md §6 naming
  trust_states_after: TrustSnapshot[];
  rule_mutation_triggered: boolean;
  world_changes: WorldChangeRecord[];     // empty except Turn 11
  consequences: ConsequenceRecord[];
  time_to_decision: number;               // ms, wall-clock — matches §6 naming
}
```

---

## 3. Test Matrix

### 3.1 Unit Tests

**Allocation**
- Valid transfer between two actors succeeds
- Transfer exceeding source actor's current allocation is rejected
- `AllocationVector` sum always equals 100 after any resolved transfer

**Trust**
- Healthy → Unstable transition fires only at the entry threshold
- Unstable → Hostile transition fires only at the entry threshold
- Recovery uses the higher exit threshold (hysteresis prevents flicker at the
  boundary)

**Neglect / Consequence**
- Consequence fires after exactly 3 consecutive below-threshold turns
- Consequence fires at most once per actor per playthrough (idempotency, spec §4.2)
- A second below-threshold streak for the same actor does **not** retrigger

**Rule Mutation**
- Mutation applies at Turn 11 and only Turn 11 (not 10, not 12)
- Turn 11's own Matrix Application uses pre-mutation weights (non-retroactive,
  spec §4.3)
- Turns 12–20 use post-mutation weights

### 3.2 Integration Test

Full 20-turn scripted playthrough:

```
Start → Turn 1 → ... → Turn 11 (Mutation) → ... → Turn 20 → Export Telemetry
```

Assertions:
- `rule_mutation_triggered == true` for exactly one turn record (Turn 11)
- Exactly 20 `TurnTelemetry` records produced
- `allocation_after` sums to 100 in every record
- Decision Diversity report generates without manual intervention (Exit Criteria)

### 3.3 Golden Simulation Test (regression guard)

A fixed-seed, fixed-input scenario whose exact output is checked into the repo as
the expected result. Any future change to core logic that alters this output must
fail the test — that failure is the signal to review, not to update the golden file
casually.

**Scope: full per-turn trace, not spot checks.** The golden file records and
asserts every turn (1–20), not just Turn 1 / Turn 11 / Turn 20. A regression
introduced mid-run (e.g. a hysteresis exit-threshold bug at Turn 7) can wash out by
Turn 20 if the scripted actions happen to re-converge the allocation vector — a
spot-check test would pass while the engine is wrong for several turns. Given the
strict step ordering in `core_gameplay_loop_v1.md` §3 (matrix application → trust
update → hysteresis eval → scheduled mutation → consequence resolution), a full
trace is the only regression guard that actually covers that ordering.

Each turn's recorded snapshot includes `internalScore` per actor **in addition to**
the player-visible `TrustState` — even though `internalScore` is never exposed in
player-facing telemetry (spec §6). It is the field most likely to catch a
clamp-ordering or accumulation bug before it manifests as a wrong visible Trust
state, per the Engine Mathematical Contract in `core_gameplay_loop_v1.md` §4.1a.

```
seed = TASK015-GOLDEN-001

Scripted turn actions (fixed, e.g.):
  Turn 1:  move 5 from StateAdministration → Investors
  Turn 2:  move 5 from Investors → SecurityEstablishment
  ...
  Turn 20: ...

Expected (checked into repo, one snapshot per turn, all 20 turns):
  Turn N: allocation_after = (...),
          internalScore_after = (...)   [all 5 actors, not player-facing]
          trust_states_after = (...)
          rule_mutation_triggered = (true only at Turn 11)
          world_changes = (...)
          consequences = (...)
```

This is the primary regression guard for Milestone 1 — it must pass before any
Milestone 2 (UI) work begins.

---

## 4. Balance Validation (separate from unit tests)

Five authored validation scenarios (spec §4.1 Balance Gate), one per actor, each
with its own objective evaluator (not raw Trust maximization). Each scenario asserts
that its target actor is the optimal allocation choice under that scenario's
objective. This is content + evaluator logic, not part of the core simulation, but
must pass before the first playtest per Exit Criteria.

**`raw_delta` magnitude guidance (balance concern, not engine architecture):**
because `allocation[source_actor]` ranges 0–100, a single source actor's
contribution to `raw_delta[actor]` is bounded by `allocation[source_actor] ×
max(|edge_weight|)`, where `max(|edge_weight|)` is whatever bound the matrix
schema declares (`core_gameplay_loop_v1.md` §4.1a) — before summing across all five
source actors. Whoever authors the matrix weights and whoever authors the
hysteresis entry/exit thresholds in `balance_config_v0.json` must draw from the
same mental model of this scale: thresholds should be chosen so a single turn's
allocation shift can move an actor meaningfully without saturating the 0–100 clamp
in one or two turns (which would make hysteresis irrelevant), and without being
negligible relative to that range (which would make Trust states feel static, one
of the named failure modes in `TASK-015-Hypothesis.md` §8). This is advisory input
to the five validation scenarios above, not a separate pass/fail gate.

---

## 5. Milestones

**Milestone 1 — Simulation Core (no UI)**
Build order (individual systems testable in isolation before orchestration):

0. **Deterministic Math Layer** — chooses and implements the concrete numeric
   representation (decimal, fixed-point, or scaled integer — an implementation
   decision made at this step, not before it) plus rounding rules and clamp
   helpers, satisfying the determinism invariants in the Engine Mathematical
   Contract (`core_gameplay_loop_v1.md` §4.1a: bit-identical results across runs,
   rounding-after-not-during-formula, clamp-after-summing). Also implements
   load-time validation of the matrix schema's declared `edge_weight` domain. Built
   and unit-tested before step 3 (`InfluenceMatrix`) and step 4 (`TrustComponent`)
   depend on it, and before the Golden Simulation Test (Section 3.3) has anything
   meaningful to check — retrofitting a rounding policy after several components
   already have ad-hoc rounding baked in is materially more expensive than
   specifying it up front.
1. `ActorId` enum + deterministic serialization tests (fixed vector order)
2. `AllocationVector` + invariant tests (sum == 100, transfer validation)
3. `InfluenceMatrix` + formula tests (absolute-state Trust delta calculation)
4. `TrustComponent` + hysteresis tests (persistence, clamp, state transitions)
5. `TurnEngine` lifecycle (orchestrates the above in spec §3 order)
6. `NeglectTracker` (idempotent consequence triggering)
7. `RuleMutationScheduler` (Turn 11, non-retroactive)
8. Telemetry exporter
9. Full 20-turn Golden Simulation Test (Section 3.3)

Fully testable headless via Section 3 unit + integration tests.

**Milestone 2 — Playable Loop**
Add UI Contract surfaces (core_gameplay_loop_v1.md §5), Confirm flow, post-turn
feedback.

**Milestone 3 — Validation**
Five Balance Gate scenarios implemented and passing; automated Decision Diversity
report wired to real telemetry output.

**Milestone 4 — Playtest Build**
No new features. Exit Criteria checklist (TASK-015-Hypothesis.md §11) fully
checked before this build is used for playtesting.

---

## 6. Change Classification From This Point Forward

Any question raised during implementation must be classified as one of:

1. **Implementation Discovery** — can the spec be represented in this data model /
   architecture as-is?
2. **Runtime Validation** — does the built game actually execute the Turn Lifecycle
   order as specified?
3. **Balance Validation** — does the actual matrix satisfy the Balance Gate?

Anything that isn't one of these three is a new design proposal and belongs in the
v0.1+ backlog (core_gameplay_loop_v1.md §8), not in this build.

**Operating rule (post-merge governance):** once `TASK-015-Hypothesis.md`,
`core_gameplay_loop_v1.md`, and this document are merged as baseline, any proposed
change to any of the three must carry one of the three tags above before it can be
opened as a PR against them. An untagged proposal — including a "wouldn't it be
nice if" raised mid-implementation — routes to the v0.1+ backlog by default, not
into a spec edit. `Implementation Discovery` and `Runtime Validation` /
`Balance Validation` findings do not require Design Review to land; any change to
`TASK-015-Hypothesis.md` still does, per that document's own
`Changes Require: Design Review` header, regardless of tag.
