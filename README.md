# Shadow State — Browser-Only Geopolitical Strategy Simulation MVP

[![Architecture Freeze](https://img.shields.io/badge/Architecture-Frozen-blue.svg)](docs/architecture_package.md)
[![Implementation Status](https://img.shields.io/badge/Implementation-Not_Started-red.svg)](docs/tasks.md)
[![Spec Kit Readiness](https://img.shields.io/badge/Spec_Kit_Readiness-100%2F100-success.svg)](docs/speckit_analysis_report.md)

> **IMPORTANT DECLARATION**:  
> **"No production source code has been implemented."**  
> This repository is currently a **Documentation-Only Architecture Freeze Repository**. All specifications, architectural decision records (ADRs), threat models, implementation plans, and executable task breakdowns have been fully ratified and locked prior to code generation.

---

## 🏛️ Project Vision & Scope

**Shadow State** is a client-side, browser-only geopolitical strategy simulation MVP focused on the Egyptian North Coast.

### MVP Scope Limits (Strictly Enforced):
- **Playable Regions**: Exactly two regions — **El Alamein** and **Ras El Hekma**.
- **Playable Factions**: Exactly two competing factions (Faction Alpha vs Faction Beta).
- **Turn-Based Engine**: Turn-based deterministic tick calculations.
- **Execution & Storage**: 100% browser-only client runtime with offline-first local persistence (IndexedDB / LocalStorage).
- **LLM Role**: Asynchronous, read-only qualitative narrative generator (`LLMNarrative`). LLMs cannot mutate game state.
- **Infrastructure Exclusions**: Zero backend servers, zero database servers, zero multiplayer networking, zero microservices.

---

## 🏗️ Architecture Overview

The system architecture strictly adheres to **Hexagonal (Ports & Adapters) Architecture**:

- **Pure Domain Layer (`src/domain/`)**: Framework-free, 100% pure ES simulation logic. Includes `GameState` & `Faction` aggregates, `Region` entities, and `TurnEngine`.
- **Seed-Based PRNG**: Mulberry32 32-bit integer PRNG algorithm seeded via `TurnSeed` for seed-based replay determinism across V8, SpiderMonkey, and JavaScriptCore engines.
- **Fixed-Point Integer Math (ADR-004)**: All resource pool calculations use scaled `BigInt` integers (1 unit = 100 base units), preventing cross-browser floating-point rounding drift.
- **Asynchronous LLM Isolation (M-02 & ADR-003)**: LLM narrative calls run asynchronously with a 3-second circuit breaker and fallback to local `MockLLMAdapter`. Every `LLMNarrative` carries an immutable `TurnNumber` validation tag.
- **Atomic Local Persistence (ADR-005)**: IndexedDB state writes use `.tmp` key swapping; quota or incognito failures fall back to `MemoryStorageAdapter`.
- **Decoupled Visual Map & UI**: PixiJS 2D canvas renderer and React UI views connect exclusively through application ports (`IRendererPort`, `IGameApplicationService`).

---

## 🗺️ Documentation Structure & Artifact Map

All finalized, ratified architectural and planning documentation is stored in the [`/docs/`](docs/) directory:

| Document Artifact | Description | Status / Verdict |
| :--- | :--- | :--- |
| 📜 [docs/constitution.md](docs/constitution.md) | Governing project principles & Phase Gate directive | Ratified & Active |
| 🏛️ [docs/architecture_package.md](docs/architecture_package.md) | Full architectural specification, C4 diagrams & ADRs | Score: 94/100 |
| 🛡️ [docs/architecture_certification.md](docs/architecture_certification.md) | 20 mandatory architectural reviews & quality gates | PASS WITH RISKS |
| ⚔️ [docs/architecture_stress_test_audit.md](docs/architecture_stress_test_audit.md) | Adversarial stress test audit, STRIDE & FMEA reports | Score: 95.5/100 |
| 📋 [docs/implementation_plan_package.md](docs/implementation_plan_package.md) | Technical roadmap, data model, contracts & folder tree | Score: 100/100 |
| 🚀 [docs/tasks.md](docs/tasks.md) | 22 dependency-ordered executable implementation tasks | Score: 100/100 |
| 🔍 [docs/speckit_analysis_report.md](docs/speckit_analysis_report.md) | Independent Spec Kit read-only consistency audit | Score: 100/100 |
| 🔬 [docs/checklist.md](docs/checklist.md) | Spec Kit requirement clarity & completeness checklist | Score: 100/100 |
| ✅ [docs/final_architecture_validation.md](docs/final_architecture_validation.md) | Final architecture sign-off & production readiness | APPROVED FOR IMPLEMENTATION |
| 📊 [docs/github_docs_audit_report.md](docs/github_docs_audit_report.md) | Critical adversarial repository audit & readiness report | Score: 94.7/100 |
| 🏆 [docs/final_architecture_freeze_certification.md](docs/final_architecture_freeze_certification.md) | Official Architecture Freeze Certification | CERTIFIED AS ARCHITECTURE DOCUMENTATION REPOSITORY |
| 👑 [docs/github_architecture_freeze_master_audit.md](docs/github_architecture_freeze_master_audit.md) | Master Architecture Freeze Audit Report | CERTIFIED AS ARCHITECTURE DOCUMENTATION REPOSITORY |
| 🛡️ [docs/master_independent_verification_report.md](docs/master_independent_verification_report.md) | Zero-Trust Independent Verification Audit Report | **READY FOR IMPLEMENTATION** |

---

## 📊 Current Lifecycle Status

```
===========================================================
Architecture Status:     FROZEN
Planning Status:         COMPLETE
Tasks Status:            COMPLETE
Validation Status:       COMPLETE
Implementation Status:   NOT STARTED
===========================================================
```

---

## 📌 Repository Cleanup & Governance Report

### Working Files Report:
- Local virtual environment `.venv/` and Spec Kit CLI tool `spec-kit/` are preserved for execution.
- Scripts `specify.bat` and `specify.ps1` exist for local CLI invocation.
- All 13 architecture documents are published into `/docs/` and synced with `.specify/memory/`.

---

## 🐙 Git Branching & Commit Guidance

For publishing this architecture freeze documentation package to GitHub:

1. **Branch**: Create a new documentation branch:
   ```bash
   git checkout -b docs/architecture-freeze
   ```
2. **Commit Message**:
   ```bash
   git add docs/ README.md .specify/
   git commit -m "docs: publish finalized architecture and specification package"
   ```
3. **Pull Request**: Open a PR to `main` for team review and merge.

---
*Shadow State Architecture Package — Ready for Implementation Phase.*
