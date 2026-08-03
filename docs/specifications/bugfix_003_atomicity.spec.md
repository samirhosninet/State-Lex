# BUGFIX-003 Patch Design Specification — Atomicity Contract Extension

```
Document ID: BUGFIX-003
Version: 1.1
Status: APPROVED
Authoritative Source: This document
Revision Type: Full replacement of all prior BUGFIX-003 drafts (Revision v1.1 Scope Extension)
Last Updated: 2026-08-03
```

Status: **APPROVED — Binding Reference for Implementation**
Supersedes: informal atomicity work in commit `23a9bab` and Specification v1.0
Depends on: BUGFIX-002 (Boundary Contract) — `VERIFIED`

---

## 1. Purpose

Extend `GSTTurnEngine.executeTurn()` so that atomicity applies to the **entire**
observable engine state, not only `allocationVector`. Commit `23a9bab` closed
BUGFIX-002 fully but left `TrustComponent` internal state (`_internalScore`,
`_visibleState`) and Step 6 world change state (`RuleMutationScheduler._hasTriggered`,
`InfluenceMatrix._edgeWeights`) mutable mid-transaction, creating a window in which an
exception thrown by `evaluateStep6()` or `evaluateStep7()` leaves the engine
in a partially-committed, internally inconsistent state.

---

## 2. Scope

### In Scope
- `TrustComponent` preview/commit split (`previewUpdate()` / `updateScore()`)
- `RuleMutationScheduler` & `InfluenceMatrix` Step 6 preview/commit split (`previewStep6()` / `commitStep6()`)
- `GSTTurnEngine.executeTurn()` transaction ordering
- Commit Barrier enforcement
- Recovery guarantees covering all stateful subsystems touched by `executeTurn()`
- Test expansion covering AC-1 through AC-5 (including AC-3a, AC-3b, and AC-4a) as unit-level tests
- Golden Campaign regression verification (AC-6, system-level evidence)

### Out of Scope / Non-Goals
- `NeglectTracker` redesign (tracked as non-blocking architectural debt, §8)
- Trust model redesign or threshold tuning
- Performance optimization
- Gameplay balancing
- Any change to `ProcessTurnUseCase.ts` (BUGFIX-002 is closed; do not reopen)

---

## 3. Architectural Contracts

### CTR-A — Boundary Validation
Status: `VERIFIED` (commit `23a9bab`). No changes required.

### CTR-B — Domain Validation
Status: `VERIFIED` (commit `23a9bab`). No changes required.

### CTR-C — Atomicity

> No observable engine state may mutate until every operation capable of
> throwing has completed successfully.

Covers:
- `allocationVector`
- `TrustComponent._internalScore`
- `TrustComponent._visibleState`
- `turnNumber`
- `RuleMutationScheduler._hasTriggered`
- `InfluenceMatrix._edgeWeights`

**Observable State (definition):** any state that can affect subsequent
engine behavior, public API results, persistence, replay determinism, or
externally visible simulation output. No field is exempt from CTR-C on the
grounds of being "internal only" — internal fields that feed any of the
above are observable state by this definition.

**`previewUpdate()` non-mutation constraint (explicit contract, not merely
an implementation consequence):**

> `previewUpdate()` MUST NOT modify any observable or internal state of the
> `TrustComponent` instance, or any other object, under any circumstance —
> including caching, counters, memoization, or logging that could later
> influence behavior. This holds even if a future change makes such
> modification appear harmless or performance-beneficial.

**Commit Barrier Contract (new):**

> Only operations classified **Commit-Safe** (defined below) may appear
> between `COMMIT BARRIER START` and `COMMIT BARRIER END`. The commit phase
> is a contiguous region containing Commit-Safe operations exclusively.

This replaces the earlier, unverifiable formulation ("no operation capable
of throwing may execute") with a classification the contract itself is built
on, so the contract is checkable by definition rather than by intuition
about what "may throw" means.

**Commit-Safe (definition):** an operation qualifies as Commit-Safe only
under one of two independent categories — the distinction exists to prevent
a circular justification where a contract inside this same specification is
used to certify an operation, while that contract's own status is what is
being established:

> - **Intrinsic Commit-Safe** — the operation is non-throwing by
>   construction, independent of any contract in this document: a
>   language/runtime guarantee (e.g. a `const` primitive assignment, a
>   field read), or a static analysis result proving the specific call site
>   cannot throw.
> - **Derived Commit-Safe** — the operation is proven non-throwing by an
>   external contract or test that was verified independently of, and prior
>   to, this specification (e.g. a pre-existing, already-shipped guarantee
>   documented elsewhere in the codebase) — or by a passing test that
>   exhaustively covers the finite, contract-defined reachable state space
>   at that call site (e.g. all enum values, all boundary cases defined by
>   an existing contract) — not the full mathematical domain of the
>   parameter's type, which is not exhaustible for types like `number`. A
>   contract defined *within* this document (CTR-A through CTR-F) MUST NOT
>   be cited as the sole basis for classifying an operation Commit-Safe,
>   because this document's own contracts are what BUGFIX-003 is in the
>   process of establishing — using one to certify compliance with another
>   inside the same implementation cycle is circular. Exhaustive-input-space
>   test evidence remains valid regardless of which contract motivated
>   writing the test.

A code comment alone (e.g. `// non-throwing`) is a claim, not evidence, and
does NOT confer Commit-Safe status under either category — consistent with
this specification's evidence standard (§9): claims are not evidence,
artifacts are.

Any call, allocation, or operation not classified Commit-Safe is a code-review
defect by default and MUST be justified explicitly in the code review before
it may be introduced inside the barrier — and even then, it does not become
Commit-Safe until the justification produces qualifying evidence per the
paragraph above.

No new object creation, collection transformation (`.map`, `.filter`, spread,
etc.), or other dynamic allocation is Commit-Safe by default; the barrier
commits precomputed values, it does not compute new ones. Such an operation
may only appear inside the barrier if it independently qualifies as
Commit-Safe under the same evidence standard.

**Future-drift rule (binding):** this classification requirement does not
lapse after initial implementation. Every operation newly introduced inside
the Commit Barrier — at any point in the codebase's future, by any
contributor or agent — SHALL receive an explicit Commit-Safe classification
(Intrinsic or Derived, with its qualifying evidence) during that change's
code review. An addition that compiles, passes existing tests, and appears
to work is NOT, by itself, evidence of Commit-Safe status. A future change
that introduces an unclassified operation inside the barrier is non-compliant
with CTR-C regardless of how long it goes unnoticed or how the reviewer at
the time judged risk.

**Reclassification rule (binding):** an operation's Commit-Safe
classification, once established, is not permanent by default. Changing an
existing operation's classification — Intrinsic to Derived, Derived to
Intrinsic, or replacing its evidence basis with a different one — SHALL be
treated as an architectural modification in its own right, requiring fresh
qualifying evidence and review at the time of the change. Evidence
established under the original classification does not carry over to a
different classification basis, even for the same call site.

**Semantic-change invalidation rule (binding):** classification is a
property of an operation's *behavior*, not of the call site's identity or
name. Any change to the implementation body of an already-classified
Commit-Safe operation — including a change that does not alter its call
site, signature, or name — invalidates its prior classification until the
new behavior is re-evaluated and re-classified. Relying on "this call site
was already approved" as justification for an operation whose body has since
changed does not satisfy CTR-C; the classification tracks what the code
currently does, not what a call site was once judged to do.

**Commit-Safe Inventory (binding):** classification is not self-attesting.
The implementer PROPOSES a classification for each operation inside the
barrier; only the conformance reviewer's recorded disposition makes it
binding. Every operation inside the Commit Barrier SHALL appear as a row in
an explicit inventory, submitted as **E-8** (§9) — a standalone artifact, not
embedded in prose or a PR description, in either Markdown table or JSON form
— with these columns:

| Operation (file:line) | Proposed Classification (Intrinsic / Derived) | Evidence Reference | Reviewer Disposition (Accepted / Rejected / Reclassified) |

A submission with no E-8 artifact, or with rows the reviewer has not filled
a disposition for, does NOT satisfy CTR-C — an unreviewed "Intrinsic" claim
from the implementer carries no more weight than any other unverified claim
this specification rejects elsewhere (§9, §9.3). The inventory itself
becomes a permanent artifact of record: a future Reclassification (see
above) is a diffable change against this E-8 artifact, not a fresh
unstructured claim.

The commit-phase boundary must be marked in code with literal comments:

```ts
// COMMIT BARRIER START — Commit-Safe operations only below this line until BARRIER END
...
// COMMIT BARRIER END
```

### CTR-D — Recovery

If any part of `executeTurn()` throws:
- `allocationVector` unchanged (value AND reference)
- `TrustComponent` internal score and visible state unchanged for all actors
- `turnNumber` unchanged
- `RuleMutationScheduler._hasTriggered` unchanged
- `InfluenceMatrix._edgeWeights` unchanged (value semantics)
- `trustStates` (derived) unchanged
- `internalScores` (derived) unchanged

All conditions must hold **simultaneously** for the same failing call.

### CTR-E — Transition Equivalence

> For every `delta` accepted by the CTR-B (Domain Validation) input
> range — i.e. every `delta` for which `updateScore()` is defined and does
> not itself throw — and for any `TrustComponent` instance in state **S**:
>
> ```
> previewUpdate(delta) == updateScore(delta)
> ```
>
> where the right-hand value is the `TrustState` returned after applying the
> update. The only permitted behavioral difference between the two
> operations is that `updateScore()` commits the already-computed transition
> to instance state, whereas `previewUpdate()` commits nothing.

This turns D-3 (§4) from a structural constraint (shared implementation)
into a testable behavioral constraint: equivalence must hold as observed
output, not merely be plausible from shared code.

**Behavioral equivalence alone is insufficient.** CTR-E, as written, checks
only the returned `TrustState` — an implementation that recomputes the
transition independently inside `updateScore()` (rather than sharing a
single computation with `previewUpdate()` per D-3) could still satisfy CTR-E
today by coincidence, while remaining a duplicated-logic implementation that
D-3 exists to prohibit. Passing CTR-E's output check does NOT waive D-3;
both MUST be satisfied independently. AC-3a tests CTR-E's output equivalence;
AC-3b tests D-3's structural constraint via the reproducible E-7 artifact
(§9) — not an unstructured, undocumented code-review opinion. Both AC-3a and
AC-3b must pass for CTR-E to be marked verified (§9.2).

### CTR-F — Behavioral Regression

> The post-fix implementation SHALL produce identical observable behavior
> and identical values across every field enumerated in AC-6 (§6) to the
> pre-fix implementation for every valid input, independent of any internal
> reordering introduced by CTR-C/CTR-E. "Observable behavior" covers
> externally visible output (public API results, persistence, replay
> determinism); the AC-6 field list additionally includes internal state
> values (e.g. `internalScores`) that are not themselves externally exposed
> but serve as the mechanism by which this equivalence is checked. AC-6 is
> the sole authoritative enumeration of what CTR-F requires — this contract
> does not define its own field list to avoid the two drifting apart. This
> is a system-level counterpart to CTR-E: CTR-E guarantees equivalence
> within a single `TrustComponent` transition; CTR-F guarantees equivalence
> across a full `executeTurn()` call chain and, cumulatively, across a full
> campaign replay.

Verified exclusively via AC-6 (§6) — the Golden Campaign, HEAD-independent
baseline procedure. No unit-level substitute is accepted for CTR-F, since its
purpose is precisely to catch drift a unit test cannot see (cross-subsystem
interaction, cumulative deterministic arithmetic drift, rounding behavior,
or ordering effects). This is not an allowance for non-deterministic
floating-point behavior — the project's deterministic math guarantees
(`DeterministicMath`) remain in force; CTR-F exists to catch any accidental
violation of that determinism introduced by reordering, not to excuse one.

---

## 4. Design Decisions

### D-1 — No Cloning
Do not clone `TrustComponent` instances. Evidence collected during
investigation proved sufficient to avoid this cost:
- `DeterministicMath.clampTrustScore()` — pure, zero side effects.
- `TrustComponent.evaluateState()` — referentially transparent; depends only
  on parameters and immutable instance configuration (`_thresholds`, fixed at
  construction, never mutated at runtime).
- `NeglectTracker.evaluateStep7()` — depends only on `TrustState[]` enum
  values, never on `TrustComponent` instance references.

### D-2 — Projection, then Commit
Replace the mutate-then-hope-nothing-fails pattern with:
```
Projection → Validation/Evaluation → Commit
```

### D-3 — Single Source of Transition Logic
`previewUpdate()` and `updateScore()` must share one implementation of the
transition calculation. Manual duplication of the calculation across two
independently maintained code paths is prohibited — it is the exact failure
mode AC-6 exists to catch, and prevention is cheaper than detection.

> `previewUpdate()` and `updateScore()` SHALL obtain their transition from
> the same single invocation of the shared transition routine
> (`computeTransition()` or equivalent). Recomputing any portion of the
> transition independently — even a single field, even via a call to
> `evaluateState()` or `clampTrustScore()` made outside that shared
> invocation — is prohibited. Partial reuse (e.g. sharing the score
> calculation but re-deriving the state separately) does not satisfy this
> contract.

Reference implementation sketch (non-binding on exact naming, binding on the
no-duplication principle):

```ts
private computeTransition(delta: number): { score: number; state: TrustState } {
  const rawScore = this._internalScore + delta;
  const score = DeterministicMath.clampTrustScore(rawScore);
  const state = this.evaluateState(score, this._visibleState);
  return { score, state };
}

public previewUpdate(delta: number): TrustState {
  return this.computeTransition(delta).state;
}

public updateScore(delta: number): TrustState {
  const { score, state } = this.computeTransition(delta);
  this._internalScore = score;
  this._visibleState = state;
  return state;
}
```

**Commit Barrier note (binding):** No transition-calculation API may be
invoked during the Commit Barrier — this includes `computeTransition()`,
`evaluateState()`, `clampTrustScore()`, and `updateScore()` specifically,
because each recomputes rather than applies an already-computed transition.
This is a specific instance of the general CTR-C rule (§3): a
transition-calculation call performs arithmetic and state-evaluation logic
by construction, so it can never be classified Commit-Safe — no test or
static analysis result can retroactively make a genuine computation
"provably non-throwing for this specific invocation" in a way that satisfies
CTR-C's evidence bar, because the computation's throw-surface is exactly
what previewUpdate() already exists to validate before the barrier. There is
no scenario in which recomputing the transition inside the barrier serves
the barrier's purpose, since the entire point of the barrier is to apply a
result already computed and evaluated before entry. This clause does not
introduce a rule stricter than CTR-C; it identifies which specific calls
CTR-C's Commit-Safe classification already excludes for this subsystem.

The implementation MUST apply the transition computed before the Commit
Barrier without recomputation and without invoking any transition-calculation
API during the barrier itself. The mechanism by which the
already-computed `{ score, state }` values are carried forward and applied
(a private commit method, a friend API, direct field assignment within the
same class, an immutable transition object, or any other mechanism whose
compliance with CTR-C and CTR-E is independently demonstrated per §9's
evidence standard) is implementation-defined. "Equivalent" is not a
self-certifying label — a mechanism is acceptable only when it is shown,
with evidence, to satisfy CTR-C (its commit-step operations are Commit-Safe)
and CTR-E (its output matches `previewUpdate()`); it does not become
acceptable merely by resembling the examples listed above. This
specification constrains the *contract* — no recomputation, no throw-capable
call inside the barrier — not the specific internal API shape.

---

## 5. Execution Flow

```
Validate
     ↓
Workspace Allocation
     ↓
Compute rawDeltas
     ↓
previewUpdate()  ← non-mutating, per TrustComponent
     ↓
evaluateStep6()
     ↓
evaluateStep7()
===== COMMIT BARRIER START =====
     ↓
Commit Allocation
     ↓
Commit Trust        ← apply previously computed Trust transition
                        without recomputation or validation
                        (see §4 D-3 Commit Barrier note)
     ↓
Commit Turn
===== COMMIT BARRIER END =====
```

---

## 6. Acceptance Criteria

### AC-1 — Negative Amount Rejected
`amount < 0` is rejected with the existing contract error. (Behavior already
implemented in commit `23a9bab`; only the test is missing.)

### AC-2 — Reference Identity Preserved After Exception
After any thrown exception, `allocationVector` and the `TrustComponent`
instances must be the **same object references** as before the call
(`toBe` / `Object.is`), not merely deep-equal.

### AC-3 — Forced Exception After Preview
Inject a failure inside `evaluateStep6()` or `evaluateStep7()` (via mock).
Assert `TrustComponent` internal state is unchanged — this is the exact path
BUGFIX-003 exists to fix, and must be proven, not assumed.

### AC-3a — Preview/Commit Equivalence (CTR-E)
For each of the three `TrustState` values (Healthy, Unstable, Hostile) as
starting state, the following `delta` categories are mandatory — not
illustrative:

| Category | Required |
|----------|----------|
| zero | required |
| positive (does not cross any threshold) | required |
| negative (does not cross any threshold) | required |
| lands exactly ON a threshold value | required, for every threshold |
| lands ε below a threshold (does not cross) | required, for every threshold |
| lands ε above a threshold (crosses) | required, for every threshold |
| clamp lower bound (score would go below 0) | required |
| clamp upper bound (score would go above 100) | required |

`ε` is the smallest representable trust increment supported by the active
deterministic numeric representation — i.e. the smallest delta capable of
changing `evaluateState()`'s output at that boundary, whatever that
representation is at implementation time (currently two-decimal precision
per `DeterministicMath.clampTrustScore()`; `1` if the domain is constrained
to integers; or the equivalent smallest unit if the numeric representation
changes in the future, e.g. a fixed-point type). This definition is
intentionally representation-agnostic so the contract does not need revision
if `DeterministicMath`'s internals change. "Threshold" means every value in
`_thresholds` (`HostileEntry`, `UnstableEntry`, `UnstableExit`,
`HostileExit`) reachable from the given starting `TrustState`, not merely
one representative threshold. This turns AC-3a from an example-based test
into a boundary test, which is where transition-logic bugs actually surface.

**Cardinality rule (binding):** the test matrix SHALL be generated from the
live `_thresholds` configuration (iterating its actual keys), not hardcoded
to today's four named thresholds. If a future change adds, removes, or
renames a threshold in `_thresholds`, the executed test count SHALL change
correspondingly without a manual edit to the test file being required for
coverage to remain complete. A test suite that continues to check only the
four thresholds named in this document after `_thresholds` has changed does
not satisfy AC-3a, even if all of its assertions pass — a fixed-count test
suite passing is not evidence of complete boundary coverage once the
underlying configuration has moved past it.

For every (starting state × category × applicable threshold) combination,
assert:

```
previewUpdate(delta) === <TrustState returned by updateScore(delta)>
```

This is a **unit-level contract test**, distinct in purpose from AC-6:
- AC-3a isolates the failure to `TrustComponent` directly if it fails.
- AC-6 catches system-level regression but does not localize the cause.
They are complementary; neither substitutes for the other.

### AC-3b — Structural Single-Source Verification (D-3)

> `previewUpdate()` and `updateScore()` SHALL be shown, via a reproducible
> static-structural artifact (E-7), to obtain their transition from exactly
> one shared code path within `TrustComponent.ts`, with no independent
> re-derivation of `score` or `state` in either method body or elsewhere in
> that compilation unit.

**"Shared code path" (definition):** both public entry points ultimately
execute the same transition implementation — traceable through any number
of intermediate calls or wrappers — without any of those intermediate calls
performing its own computation of `score` or `state`. A wrapper that merely
forwards arguments and the return value to the one shared implementation is
permitted; a wrapper, helper, or "v2" function that independently computes
any part of the transition (even if it internally calls the shared
implementation for another part) breaks single-sourcing and fails AC-3b,
regardless of whether its output happens to match today. E-7's artifact must
demonstrate the full call chain from each entry point down to the shared
implementation, not merely that a call exists somewhere in each entry
point's body.

Unlike AC-3a (which checks *output* equivalence), AC-3b checks *structure* —
it is the acceptance criterion that keeps the Contract → Acceptance →
Evidence model uniform for CTR-E: AC-3a alone could pass by coincidence if
an implementation duplicated the calculation and happened to keep it in
sync; AC-3b closes that gap by requiring structural proof, not output
sampling, that the calculation is not duplicated at all.

### AC-4 — Forced Exception After Step6, Before Step7
Assert `allocationVector` unchanged.

### AC-5 — Forced Exception Immediately Before Commit
Assert the entire engine state (allocation, trust, turnNumber) unchanged.

### AC-6 — Behavioral Equivalence Regression

> Given identical initial engine state and identical valid
> `GSTAllocationMoveInput`, the post-fix implementation shall produce
> identical `allocationAfter`, `internalScores`, `trustStatesAfter`,
> `worldChanges`, `consequences`, and `turnNumber` compared to the approved
> behavioral baseline. The implementation may change execution order
> internally, but shall not change externally observable behavior.

**Baseline independence is mandatory.** The baseline MUST be produced from
`HEAD` **before** any BUGFIX-003 code change, stored outside `src/`, and used
unmodified for the post-fix comparison. Generating the baseline after the fix
(self-validating regression) is prohibited — it certifies whatever the new
code does rather than catching drift.

**Storage:**
```
/tmp/bugfix003/
    golden_campaign_before.json
    golden_campaign_after.json
    comparison.txt
```
These artifacts are evidence, not deliverables — they must NOT be committed
to the source tree.

**Procedure:**
1. On `HEAD` (pre-fix), run `GoldenCampaignTest.js`; save output as
   `golden_campaign_before.json`.
2. Implement BUGFIX-003 per §4 and §5.
3. Re-run `GoldenCampaignTest.js`; save output as
   `golden_campaign_after.json`.
4. Produce `comparison.txt` — a bit-for-bit diff (or hash comparison) of the
   two artifacts, generated by a command, not by the implementer's judgment.
5. All 100 turns must match bit-for-bit. Partial or "close enough" matches do
   not satisfy AC-6.

**Failure Policy (binding):**

> Any AC-6 failure immediately invalidates implementation approval. The
> observed divergence becomes a new architectural investigation item. No
> compensating patches, behavioral adjustments, or acceptance-baseline
> updates are permitted until the divergence root cause is understood.
> Regenerating the baseline after a failure to force a pass is explicitly
> prohibited.

---

## 7. Required Verification Artifacts

### 7.1 Runtime Tests

- `negative amount rejected` (AC-1)
- `reference identity preserved after exception` (AC-2)
- `failure injected after previewUpdate, before commit barrier` (AC-3)
- `preview/commit equivalence across all TrustState × delta combinations` (AC-3a)
- `failure injected after evaluateStep6, before evaluateStep7` (AC-4)
- `failure injected immediately before commit` (AC-5)
- `golden campaign regression, bit-for-bit` (AC-6)

### 7.2 Static Verification

- `structural single-source verification via reproducible static query`
  (AC-3b) — NOT a runtime test; see E-7 (§9) for the property this artifact
  must establish and the acceptable technique classes.

---

## 8. Known Architectural Debt (Non-blocking)

> `NeglectTracker` mutates internal counters (`_belowThresholdCounter`,
> `_hasTriggered`) during `evaluateStep7()`. This is NOT blocking for
> BUGFIX-003 closure because, in the current implementation, no throwing
> path exists after `evaluateStep7()` returns. If any future change
> introduces throwable logic after `evaluateStep7()` (inside `executeTurn()`
> or in code called from it before the commit barrier), `NeglectTracker`
> MUST be brought under the same Atomicity Contract (§3, CTR-C) before
> that change is merged.

---

## 9. Evidence Requirements

The implementation report MUST attach raw artifacts, not summaries or
pass/fail claims. Required:

| ID | Evidence |
|----|----------|
| E-1 | Raw `git diff` / `git show` of all modified files |
| E-2 | Pre-fix Golden Campaign artifact (`golden_campaign_before.json`) |
| E-3 | Post-fix Golden Campaign artifact (`golden_campaign_after.json`) |
| E-4 | Artifact comparison output (`comparison.txt`) |
| E-5 | Full unit test execution log (raw `vitest` output, not a summary) |
| E-6 | Reference identity test raw assertion output (AC-2) |
| E-7 | Static structural verification artifact for D-3 / AC-3b. The artifact SHALL demonstrate the property: within the scope of `TrustComponent.ts` (the compilation unit), all public transition entry points (`previewUpdate()`, `updateScore()`) delegate to a single transition implementation, and no independent transition derivation of `score` or `state` exists elsewhere in that compilation unit. The claim is scoped to this file deliberately — a general, whole-program claim that "exactly one implementation exists anywhere" is not something any static-analysis technique can decide in general, so the artifact must prove the scoped, decidable version of the property, not the unscoped one. The implementation MAY use an AST query, a `grep`/`ripgrep` report with line numbers, a CodeQL query, a Semgrep rule, or any other reproducible static-analysis technique capable of proving that specific scoped property — the tool is not prescribed, but whichever is used MUST actually establish the property above, not merely a proxy for it (e.g. a `grep` match count is only sufficient if it demonstrably rules out a second logical derivation, not merely a second textual occurrence of similar-looking code). A prose review summary alone does NOT satisfy E-7 — the query/rule and its raw output must be attached so a reviewer can rerun it. |
| E-8 | Commit-Safe Inventory (§3, CTR-C) — a standalone Markdown or JSON artifact listing every operation inside the Commit Barrier with its proposed classification, evidence reference, and reviewer disposition, per the table format defined in §3. Not embedded in the implementation report's prose. |

A report that states "AC-6 passed" or "Golden Campaign matched" without the
corresponding raw artifact (E-2/E-3/E-4) does not satisfy this specification
and must be rejected on resubmission, per the same standard applied
throughout this review: **agent claims are not evidence; artifacts are.**

### 9.1 Acceptance ↔ Evidence Mapping

| Acceptance | Required Evidence |
|------------|--------------------|
| AC-1       | E-5                |
| AC-2       | E-6                |
| AC-3       | E-5                |
| AC-3a      | E-5                |
| AC-3b      | E-7                |
| AC-4       | E-5                |
| AC-5       | E-5                |
| AC-6       | E-2 + E-3 + E-4    |

E-8 is a deliberate exception to the Acceptance ↔ Evidence model: it maps
directly to CTR-C rather than through a numbered AC, because Commit-Safe
classification is a per-operation inventory process rather than a single
pass/fail assertion — no single AC could represent "every operation in the
barrier, individually classified and reviewed" without effectively
duplicating E-8's own table. CTR-C's Exit Criteria (§10) require E-8
directly for this reason.

No acceptance criterion may be marked satisfied without its mapped evidence
attached in raw form. AC-3a checks CTR-E's *output* equivalence; AC-3b
checks D-3's *structural* single-source requirement. Both feed CTR-E's
traceability row (§9.2) — the model stays uniform (Contract → Acceptance →
Evidence) with no contract verified by evidence alone, bypassing an
acceptance criterion — E-8/CTR-C excepted as noted above.
acceptance criterion.

**Evidence completeness rule (binding):** "attached" means the complete raw
artifact, unmodified. A missing artifact, a truncated excerpt, a
human-written summary of an artifact's contents, or a manually reconstructed
transcript of what an artifact allegedly showed SHALL be treated identically
to a failing artifact — not as a lesser form of passing evidence. A report
stating "Vitest passed (see CI)" without the raw log attached does not
satisfy E-5, regardless of whether CI actually passed. This rule is not new
in substance — it is the same evidence standard applied throughout this
specification (§9 preamble: claims are not evidence, artifacts are) — stated
explicitly here so "attached" cannot be read as satisfied by a reference,
a link that may later rot, or a paraphrase.

### 9.2 Contract ↔ Acceptance Traceability

| Contract | Verified By |
|----------|-------------|
| CTR-A — Boundary Validation | AC-1 |
| CTR-B — Domain Validation | AC-1 |
| CTR-C — Atomicity | AC-3, AC-4, AC-5 (+ E-8 Commit-Safe Inventory, directly) |
| CTR-D — Recovery | AC-2, AC-5 |
| CTR-E — Transition Equivalence | AC-3a, AC-3b |
| CTR-F — Behavioral Regression | AC-6 |

A contract marked "implemented and verified" in §10 must have every
acceptance criterion in its row passing, with the corresponding evidence
from §9.1 attached.

### 9.3 Evidence-First Conformance Rule

Every rule in §9 up to this point governs what the *implementer* must
attach. It says nothing about how the *reviewer* must review — leaving open
the same failure mode this specification exists to prevent, just relocated
to the other side of the review: a reviewer reading "AC-3b VERIFIED (see
attached E-7)" in an implementation report and checking a box without
opening E-7 itself is the reviewer trusting a claim exactly as this document
forbids the implementer from offering one.

**Evidence-First Conformance Rule (binding):**

> During conformance review, verification SHALL begin from the raw evidence
> artifacts (E-1 through E-7), not from the implementation report's
> pass/fail claims. The implementation report may be used only as an index
> pointing to evidence — e.g. "AC-3b evidence is in E-7, attached as
> `trust_component_transition_query.txt`" — never as evidence itself. Any
> acceptance criterion marked satisfied in a conformance review without the
> reviewer directly inspecting its mapped evidence (§9.1) SHALL be treated
> as unverified, regardless of how confident the implementation report's
> claim reads.

This rule adds no new contract, no new evidence type, and no change to
Traceability (§9.1, §9.2) — it constrains only the reviewer's procedure,
which the rest of §9 leaves unstated. §9's Evidence Completeness Rule binds
the implementer to attach complete, raw, unsummarized evidence; this rule
binds the reviewer to actually open what was attached. The two rules cover
opposite sides of the same failure and are independently necessary — a
complete evidence attachment does not verify itself, and a diligent reviewer
cannot verify a claim against evidence that was never attached.

**Query sufficiency sub-rule (E-7 specifically, binding):** opening E-7 is
not, by itself, sufficient review for AC-3b. A query or rule can exist,
run without error, and produce output while still being too weak to
establish the scoped property E-7 requires (§9) — e.g. a Semgrep pattern
matching only `computeTransition(...)` calls would silently miss a wrapper
that re-derives part of the transition through a differently-named helper.
The reviewer SHALL independently judge whether the submitted query's logic
is actually capable of detecting a violation of the property, not merely
confirm that a query was submitted and produced a passing result. A query's
existence is not evidence of the query's sufficiency.

**Sufficiency acceptance bar (binding):** proving a static-analysis query
sound in general (zero false negatives across all possible code) is not
required and is not achievable for most of the technique classes this
document permits (§9, E-7). Instead, sufficiency is established by a
concrete, reproducible negative control: the submitter (or reviewer) SHALL
demonstrate the query against at least one deliberately introduced
synthetic violation — e.g. a temporary wrapper function that independently
recomputes `score` via a differently-named helper — and show the query
flags it. A query that produces a clean result against the real code but has
never been shown to catch a constructed violation of the same shape does NOT
meet the sufficiency bar; a query that demonstrably catches the constructed
violation, then produces a clean result against the real implementation,
does. This bar is deliberately narrower than "provably sound" and wider than
"ran without error" — it is the same principle as a unit test needing to be
shown capable of failing before its passing result means anything.

### 9.4 Failure Classification

When an acceptance criterion fails during conformance review, the failure
SHALL be classified before any remediation begins — "investigate and fix"
is not sufficient triage on its own, since different failure types require
different responses and different owners:

| Failure | Classification | Typical Response |
|---------|-----------------|-------------------|
| AC failed with valid, sufficient evidence attached | Implementation defect | Fix the code; no specification change |
| Evidence missing, truncated, or insufficient (fails §9 / §9.3) | Verification failure | Resubmit evidence; implementation status remains unknown, not failed |
| Implementer required clarification or made an undocumented assumption not resolvable from the text alone | Specification deficiency | §11 Specification Change Classification applies |
| The chosen tool/query class cannot establish the required property regardless of how it's written (e.g. `grep` fundamentally cannot prove absence of logical duplication) | Verification infrastructure defect | Different technique required for E-7/AC-3b; not an implementation bug |

A failure MUST be assigned exactly one primary classification before it is
reported as resolved. Classifying a Specification Deficiency as an
Implementation Defect (or vice versa) misdirects the fix and is itself a
process error worth flagging in the conformance report.

**Priority rule (binding):** when a failure plausibly fits more than one row
— e.g. the specification is ambiguous AND the implementation also
misinterpreted it — classification precedence is fixed, highest first:

1. **Verification failure** (missing/insufficient evidence) — if the
   evidence itself doesn't establish anything, no other classification can
   be determined yet; resolve this first regardless of suspected cause.
2. **Verification infrastructure defect** — if the evidence is complete but
   the technique used cannot in principle establish the required property,
   the failure is in the check, not in what's being checked; this must be
   resolved before the underlying AC can be judged pass or fail at all.
3. **Specification deficiency** — if the evidence is adequate and the
   technique is sound, but the implementer's action was a defensible reading
   of ambiguous or silent text, the specification is at fault before the
   implementation is.
4. **Implementation defect** — assigned only once the above three are ruled
   out: valid, sufficient evidence exists; the verification technique is
   sound; and the specification's requirement was unambiguous. Only then
   does the failure belong to the code.

This ordering exists because classifying "up" the list (e.g. defaulting to
Implementation defect) is the failure mode most likely to produce a fix that
doesn't address the actual root cause — patching code against evidence that
was never properly checked, or against a specification requirement that was
genuinely unclear.

### 9.5 Review Outcome Contract

§9.1 through §9.4 govern how evidence is produced, inspected, and failures
classified. None of that constrains what the reviewer is allowed to
*conclude* at the end — leaving room for an invented, ad hoc verdict (or a
report that quietly treats "mostly passing" as good enough). This section
closes that gap.

**Fixed outcome set (binding):** a conformance review SHALL conclude with
exactly one of the following outcomes, recorded verbatim — no other wording
constitutes a valid review conclusion:

- `PASS` — every CTR in §9.2 is verified per its row, every mapped AC
  passed with attached evidence, E-8 has a full reviewer disposition for
  every row, and no failure was recorded under §9.4.
- `PASS WITH SPEC REVISION` — the implementation is behaviorally and
  structurally sound, but achieving that required a Specification
  Deficiency resolution (§9.4, §11) that has been completed and the Version
  header (§0) incremented accordingly. Only usable after the revision is
  actually merged, not while it is pending.
- `FAIL — IMPLEMENTATION` — one or more failures classified Implementation
  Defect (§9.4) remain unresolved.
- `FAIL — SPECIFICATION` — one or more failures classified Specification
  Deficiency remain unresolved (revision proposed but not yet approved).
- `INSUFFICIENT EVIDENCE` — one or more required artifacts (E-1 through E-8)
  are missing, incomplete, or failed the sufficiency bar (§9.3); the
  implementation's actual status (pass or fail) is genuinely undetermined,
  and SHALL NOT be reported as either.

**No partial approval rule (binding):** there is no outcome meaning
"acceptable overall despite N failing items." A review with any unresolved
failure (any classification) or any `INSUFFICIENT EVIDENCE` condition SHALL
conclude `FAIL` or `INSUFFICIENT EVIDENCE` — never `PASS` — regardless of how
few criteria failed, how minor the reviewer judges the failure to be, or how
much of the specification did pass. §10's Exit Criteria is a checklist of
requirements, not a threshold to be substantially met; "everything passed
except AC-6" is a `FAIL`, stated plainly, not an implicit pass with a caveat
buried in prose.

**Versioned review record (binding):** every conformance review SHALL be
recorded as a standalone artifact containing at minimum:

| Field | Requirement |
|-------|-------------|
| Review ID | unique, monotonically assigned |
| Specification Version | the exact §0 Version this review was conducted against |
| Evidence Version / Commit | the exact commit hash or evidence-bundle identifier reviewed |
| Reviewer | identity of whoever conducted the review |
| Outcome | one of the fixed outcomes above, verbatim |
| Failure Classifications | every failure recorded, with its §9.4 classification and priority-rule resolution if multiple applied |

This makes every review reconstructible independently of the implementer's
report — the same principle §9.3 applies to evidence, applied here to the
review's own output, so a review's conclusion is itself an artifact subject
to the same "claims are not evidence" standard as everything else in this
specification.

---

## 10. Exit Criteria

BUGFIX-003 is not closed until ALL of the following hold:

- [ ] All six architectural contracts (§3, CTR-A through CTR-F) are
      implemented and verified per the Traceability Matrix (§9.2).
- [ ] No mutation occurs before the commit barrier.
- [ ] Every operation inside the Commit Barrier is classified Commit-Safe
      per CTR-C, recorded in the E-8 Commit-Safe Inventory with a reviewer
      disposition for every row — not merely "no exception observed during
      testing", and not merely proposed by the implementer without a
      recorded disposition.
- [ ] `previewUpdate()` and `updateScore()` share one transition
      implementation (D-3), with no duplicated logic — demonstrated by the
      reproducible E-7 artifact (AC-3b), not inferred from AC-3a passing
      alone — and pass AC-3a equivalence testing.
- [ ] AC-1 through AC-6 (including AC-3a and AC-3b) all pass, each backed by
      its required evidence (§9).
- [ ] No path exists that leaves `TrustComponent` or `allocationVector` in a
      partial state under any exception.
- [ ] `NeglectTracker` debt (§8) is documented, not silently dropped.

Only after all boxes are checked, with evidence attached, may Legacy
Retirement begin.

---

## 11. Specification Authority

> If implementation, comments, agent reasoning, execution reports, or
> generated code conflict with this specification, this specification
> prevails.
>
> Only evidence may invalidate this specification — and only through a
> formal revision (incrementing the Version header in §0), not through
> silent deviation during implementation.
>
> No implementation detail may redefine the contracts herein during
> implementation of this specification. "Implemented differently but still
> correct" is not a valid basis for silent deviation; if the implementation
> conflicts with a contract in §3, the implementation is wrong until this
> document is revised to say otherwise through a formally approved
> specification revision (§0 Version increment) — not through ad hoc
> justification at implementation or review time. This governs deviation
> during the current implementation cycle; it does not forbid future
> architectural improvement, only improvement introduced outside the
> revision process this section defines.

**Specification Change Classification (binding):** any future change
affecting any of the following SHALL require a formal specification
revision with a Version increment (§0):

- any Architectural Contract (CTR-A through CTR-F)
- any Acceptance Criterion (AC-*)
- any Evidence Requirement (E-*)
- Commit-Safe classification semantics (§3, CTR-C)
- Commit Barrier boundaries
- any Traceability mapping (§9.1, §9.2)
- conformance review procedure (§9.3, §9.4)
- Commit-Safe Inventory structure or disposition process (§3, CTR-C)
- the E-8 artifact format or requirement (§9)
- the fixed Review Outcome set or No Partial Approval rule (§9.5)

Pure editorial changes — formatting, wording that does not alter normative
meaning, typo corrections, or examples explicitly marked non-normative — do
NOT require a Version increment. When in doubt whether a proposed change is
normative or editorial, it is treated as normative by default; the burden of
demonstrating a change is purely editorial falls on whoever proposes it, not
on whoever reviews it.
