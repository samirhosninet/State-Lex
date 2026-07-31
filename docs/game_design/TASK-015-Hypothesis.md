# TASK-015 — Core Gameplay Loop: Hypothesis Brief (v0)

```
Document Status: FROZEN
Version: v0.9.2
Freeze Date: 2026-07-31
Changes Require: Design Review
```

> **Amendment Log**
> - **v0.9 → v0.9.1** (2026-07-31): Rule Mutation timing fixed from "turn 10–12" to
>   **Turn 11 (exact)**, to make playtest sessions comparable and remove
>   implementation ambiguity. This is a measurability clarification, not a scope
>   change — approved via Design Review per this document's own change-control rule.
> - **v0.9.1 → v0.9.2** (2026-07-31): Narrowed the "Trust Memory" exclusion in
>   Section 5 to name what is actually banned (historical relationship modeling,
>   past-event recall, actor-specific behavioral memory, hidden expectations), so it
>   cannot be misread as prohibiting the persisting Trust score that
>   `core_gameplay_loop_v1.md` §3 already implements. This is a wording
>   clarification of an existing exclusion, not a scope change — approved via Design
>   Review per this document's own change-control rule.

**Owner decision required:** Yes (scope lock) — resolved by freeze above

---

## 1. What This Document Is

This is **not** a game design document. It defines the single question the v0 Vertical
Slice must answer, what is in scope to test it, and what is explicitly deferred.

Once this brief is approved, writing `core_gameplay_loop_v1.md` becomes an execution
task, not a design negotiation.

---

## 2. Player Fantasy (locked)

> You are the **Architect of the Shadow State** — not a formal ruler, but every crisis
> on the North Coast gives you a chance to reshape the balance of power. You build
> influence networks, exploit crises, and create alliances and conflicts, until you
> become the force no one can afford to ignore.

---

## 3. The Hypothesis Being Tested in v0

> **Allocating a limited Influence Capacity across competing, interdependent actors
> produces more interesting decisions over 20 turns than treating Influence as a
> single accumulated number.**

Everything in this brief exists to test this one claim. Nothing else.

---

## 4. In Scope — v0

| Element | Definition |
|---|---|
| **Actors (5)** | State Administration, Investors, Security Establishment, Local Communities, Media |
| **Influence Capacity** | Fixed pool = 100, allocated (not accumulated) across the 5 actors |
| **Allocation mechanic** | Every reallocation moves capacity from one actor to another — no free gains |
| **Fixed influence matrix** | One static 5×5 table of how raising allocation to actor A shifts trust with actor B (already drafted — see Appendix) |
| **Trust states (per actor)** | Three visible states only: `Healthy / Unstable / Hostile`. Backed by an internal numeric score with **hysteresis** between state transitions (entry and exit thresholds differ, to prevent flickering) |

> **Implementation note:** Transition thresholds are intentionally unspecified in this
> brief. Only the *existence* of hysteresis is required here. Exact numeric thresholds
> belong to balancing, not to this hypothesis document.
| **Trust decay** | Neglecting an actor below its threshold for 3 consecutive turns triggers an automatic negative consequence tied to that actor |
| **One scripted Rule Mutation** | A single guaranteed event at **Turn 11 (fixed)** (e.g. "Governor Reshuffle") that permanently changes the weight of exactly one edge in the influence matrix. It **must not** introduce new actors, new mechanics, new resources, or new UI — it only edits one existing number in the existing matrix |
| **Turn count** | 20 turns, hard stop |

> **Decision Unit:** one completed turn resulting in a committed influence
> reallocation and an end-turn confirmation. This is the unit all Decision Diversity
> and behavior metrics are measured against.

> **Balance Gate:** no actor may become the dominant allocation target under neutral
> starting conditions. Every actor must have at least one realistic in-game situation
> where increasing its allocation is the strategically correct move. If the matrix
> makes one actor the obvious best target regardless of situation, the matrix — not
> the hypothesis — needs revision before playtesting.

---

## 5. Explicitly Out of Scope for v0

Do not build, even partially:

- Trust **Memory** — meaning historical relationship modeling, recall of specific
  past events (which actor did what, when), actor-specific behavioral memory, or
  hidden per-actor expectations the system reasons over. This does **not** prohibit
  a single persisting numeric Trust score per actor that the current turn's formula
  updates — that persistence is required for hysteresis and the Neglect Counter to
  function at all, and is specified in `core_gameplay_loop_v1.md` §3. What's banned
  is a discrete event log or any logic that queries "what happened before," not a
  running number.
- **Expected Allocation** per actor (target thresholds actors silently hold you to)
- Reputation layers beyond the 3-state Trust
- Relationship **histories** between actors (independent of the player)
- Adaptive/reactive AI behavior per actor
- Dynamic, continuously-evolving network weights
- Any political/rights/constitutional simulation layer
- More than one Rule Mutation event

If a design idea doesn't help answer the Section 3 hypothesis, it is deferred — not discarded, just not now.

---

## 6. Hypothesis Roadmap

| Hypothesis | Tested in |
|---|---|
| Allocation beats a single numeric Influence resource | **v0** |
| Trust state (Healthy/Unstable/Hostile) creates real tension | **v0** |
| A single Rule Mutation adds meaningful depth | **v0** |
| A continuously dynamic network is worth its complexity cost | v0.1 |
| Trust Memory adds value | v0.2 |
| Adaptive, actor-driven relationships are worth the complexity | v0.3 |

Each row is falsifiable independently. A failed hypothesis is removed without
invalidating the rest of the design.

---

## 7. Success Criteria (after playtest)

- Player pauses and visibly deliberates before reallocating capacity (not reflexive clicking)
- Player states, unprompted, that they left an actor under-resourced *on purpose* to protect another relationship
- No single fixed allocation pattern emerges as "obviously correct" across multiple playtesters
- The turn-11 Rule Mutation causes at least one player to say something equivalent to "wait, that changes everything"
- **Rule Mutation impact:** at least 40% of playtesters visibly change their
  allocation strategy within two turns following the Rule Mutation event
- **Decision Diversity:** across all playtest participants, no single allocation
  pattern accounts for more than 60% of turns played. If one pattern dominates
  consistently, the hypothesis is considered weakened — even if players report
  enjoying the experience

## 8. Failure Criteria

- Player finds a stable rule ("always keep Security above X") within the first 10 turns and stops deliberating
- Trust states change so rarely, or so predictably, that they're ignored
- The Rule Mutation event passes without any visible change in player behavior
- Playtesters describe the experience as "a spreadsheet with extra steps"

---

## 9. Non-Goals

v0 is **not** intended to prove or demonstrate:

- Historical realism
- Political realism
- AI quality
- Campaign longevity
- Replayability beyond the 20-turn slice

Feedback along these lines during the v0 playtest is out of scope for this hypothesis
and should be logged separately, not treated as a failure signal.

---

## 10. What Happens Next

- **If v0 hypothesis succeeds:** proceed to `core_gameplay_loop_v1.md` using this brief
  as the locked foundation, then evaluate v0.1 (Dynamic Network) as a separate,
  isolated experiment.
- **If v0 hypothesis fails:** do not add complexity to fix it. Return to Section 3 and
  re-examine whether Allocation itself — not the surrounding systems — is the wrong
  core mechanic.

---

## 11. Exit Criteria

The v0 implementation is considered complete — and ready for playtest — only when
all of the following are true:

- [ ] 20-turn playable slice exists
- [ ] All five actors are represented
- [ ] Allocation UI is functional
- [ ] Trust states are visible
- [ ] Rule Mutation occurs exactly once
- [ ] Telemetry records every Decision Unit
- [ ] Decision Diversity metric is automatically computed
- [ ] Playtest data can be exported without manual processing

No feature beyond this list is required before the first playtest. Once every box is
checked, implementation stops and testing begins — adding anything further at that
point is scope creep, not readiness.

---

## Appendix: Draft Influence Matrix (for reference, not final)

*Directional effect when allocation to the row actor increases:*

| ↓ increases → affects | State/Admin | Investors | Security | Communities | Media |
|---|---|---|---|---|---|
| **State/Admin** | — | trust +, slower bureaucracy | easier coordination + | doubts about real representation − | "legitimacy" narrative + |
| **Investors** | pressure to fast-track − | — | demand protection for projects + | displacement risk − | corruption stories − |
| **Security** | conditional loyalty + | sense of safety for projects + | — | friction/arrests − | surveillance/censorship − |
| **Communities** | representation demands ↑ | resistance to foreign investment − | escalating friction − | — | media sympathy + |
| **Media** | greater scrutiny − | investor confidence drops − | exposes overreach − | amplifies grievances + | — |
