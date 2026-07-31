# Shadow State — STRIDE & LINDDUN Threat Model

**Project**: Shadow State (Browser-Only Geopolitical Strategy Simulation MVP)  
**Document Status**: Security & Threat Analysis Evidence  

---

## 1. STRIDE Threat Analysis Matrix

| STRIDE Category | Target Asset | Threat Description | Security Control | Residual Risk |
| :--- | :--- | :--- | :--- | :--- |
| **Spoofing** | Player Identity | Player spoofs identity in single-player game | N/A (Single-player local client) | **NEGLIGIBLE** |
| **Tampering** | Saved Game State | Player edits IndexedDB JSON snapshot to forge resources | Schema validator in `TASK-012` rejects invalid structures | **LOW** |
| **Repudiation** | Action Log | Player denies performing turn action | Action history recorded deterministically in turn log | **LOW** |
| **Information Disclosure**| LLM API Key | LLM API Key leaked via network telemetry | API Key held in memory/volatile storage; 0 remote tracking | **LOW** |
| **Denial of Service** | React UI Thread | Long-running turn calculation freezes UI | Tick executes in `< 16ms`; 3s timeout on LLM fetch | **LOW** |
| **Elevation of Privilege**| Browser Sandbox | LLM response attempts prompt injection script execution | LLM text parsed as read-only string; 0 code evaluation | **NEGLIGIBLE** |

---

## 2. LINDDUN Privacy Analysis

- **Linkability**: 0 user tracking cookies or third-party telemetry.
- **Identifiability**: Client-side execution; 0 user PII collected.
- **Non-repudiation**: Local game logs only.
- **Detectability**: Offline-first design prevents network eavesdropping.
- **Disclosure of Information**: Storage isolated within browser origin sandbox.
