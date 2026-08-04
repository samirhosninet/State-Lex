import { StartGameUseCase } from '../application/usecases/StartGameUseCase';
import { ProcessTurnUseCase, TurnTelemetryDTO } from '../application/usecases/ProcessTurnUseCase';
import { SaveGameUseCase } from '../application/usecases/SaveGameUseCase';
import { LoadGameUseCase } from '../application/usecases/LoadGameUseCase';
import { IndexedDBStorageAdapter } from '../infrastructure/persistence/IndexedDBStorageAdapter';
import { GameStateSnapshotDTO } from '../application/dtos/Snapshots';
import { computeStateHash } from '../application/services/CanonicalHashService';

// Retained exported interface — no modification
export interface HumanManualTelemetryRecord {
  readonly eventId: string;
  readonly timestamp: string;
  readonly interactionMode: "human_manual";
  readonly turnNumber: number;
  readonly money: number;
  readonly influence: number;
  readonly security: number;
  readonly controlledRegions: string[];
  readonly choice: "DEVELOP_MONEY" | "DEVELOP_INFLUENCE" | "FORTIFY" | "REDEPLOY";
  readonly targetRegionId: "EL_ALAMEIN" | "RAS_EL_HEKMA";
  readonly reasonCode: "A" | "B" | "C" | "D" | "E";
  readonly reasonText?: string;
  readonly decisionTimeMs: number;
  readonly stateBeforeHash: string;
  readonly stateAfterHash: string;
}

/* ─── Engine Names (unchanged — used in DebugDrawer only) ─── */
const ACTOR_NAMES = [
  "State Administration",
  "Investors",
  "Security Establishment",
  "Local Communities",
  "Media"
];

/* ─── Component 3: Presentation Aliases (surface only, no engine rename) ─── */
const ACTOR_ALIASES = [
  "Estate Administration",
  "Investment Partners",
  "Guest Safety",
  "Staff & Community",
  "Media & Reputation"
];

/* ─── Component 2: Season Phase (presentation-only, derived from turnNumber) ─── */
function getSeasonPhase(turnNumber: number): string {
  if (turnNumber <= 5) return 'Early Season';
  if (turnNumber <= 10) return 'Peak Season';
  if (turnNumber === 11) return 'Season Turning Point';
  if (turnNumber <= 17) return 'Late Season';
  return 'Season Close';
}

function getSeasonColor(turnNumber: number): string {
  if (turnNumber <= 5) return '#14b8a6';
  if (turnNumber <= 10) return '#fcd34d';
  if (turnNumber === 11) return '#f87171';
  if (turnNumber <= 17) return '#f59e0b';
  return '#94a3b8';
}

/* ─── Component 4: Semantic Trust States ─── */
const TRUST_SEMANTICS: Record<string, { color: string; glyph: string }> = {
  'Healthy':  { color: '#14b8a6', glyph: '\u25CF' },  // ● teal calm dot
  'Unstable': { color: '#f59e0b', glyph: '\u25B2' },  // ▲ amber warning triangle
  'Hostile':  { color: '#f87171', glyph: '\u25C6' }    // ◆ coral alert diamond
};

/* ─── Stakeholder identity tints (weak, for band segment background) ─── */
const STAKEHOLDER_TINTS = [
  '#e2e8f0',   // Estate — limestone
  '#fcd34d',   // Investment — champagne gold
  '#818cf8',   // Guest Safety — dusk indigo
  '#fb923c',   // Staff & Community — warm coral-tan
  '#67e8f9'    // Media — aqua signal
];

interface DecisionHistoryEntry {
  readonly turnNumber: number;
  readonly sourceIndex: number;
  readonly targetIndex: number;
  readonly amount: number;
}

export class GameView {
  private _currentSnapshot: GameStateSnapshotDTO;
  private _previousSnapshot: GameStateSnapshotDTO | undefined = undefined;
  private readonly _startGameUseCase: StartGameUseCase;
  private readonly _processTurnUseCase: ProcessTurnUseCase;
  private readonly _saveGameUseCase: SaveGameUseCase;
  private readonly _loadGameUseCase: LoadGameUseCase;
  private _lastTelemetry: TurnTelemetryDTO | undefined = undefined;
  private readonly _decisionHistory: DecisionHistoryEntry[] = [];
  private _debugDrawerOpen = false;

  constructor(containerElement: HTMLElement) {
    const persistenceAdapter = new IndexedDBStorageAdapter();

    this._startGameUseCase = new StartGameUseCase();
    this._processTurnUseCase = new ProcessTurnUseCase();
    this._saveGameUseCase = new SaveGameUseCase(persistenceAdapter);
    this._loadGameUseCase = new LoadGameUseCase(persistenceAdapter);

    this._currentSnapshot = this._startGameUseCase.execute();

    this.render(containerElement);
  }

  /* ─── Allocation / Trust array helpers ─── */

  private getAllocationArray(snapshot: GameStateSnapshotDTO): number[] {
    const a = snapshot.allocation;
    return [a.stateAdministration, a.investors, a.securityEstablishment, a.localCommunities, a.media];
  }

  private getTrustStatesArray(snapshot: GameStateSnapshotDTO): string[] {
    const s = snapshot.trust.states;
    return [s.stateAdministration, s.investors, s.securityEstablishment, s.localCommunities, s.media];
  }

  private getTrustScoresArray(snapshot: GameStateSnapshotDTO): number[] {
    const s = snapshot.trust.scores;
    return [s.stateAdministration, s.investors, s.securityEstablishment, s.localCommunities, s.media];
  }

  /* ═══════════════════════════════════════════════════════════
     COMPONENT 2 — Resort Shell (Header)
     ═══════════════════════════════════════════════════════════ */
  private renderResortHeader(): string {
    const turn = this._currentSnapshot.turnNumber;
    const phase = getSeasonPhase(turn);
    const phaseColor = getSeasonColor(turn);

    return `
      <header style="max-width: 1100px; margin: 0 auto 1.5rem; background: linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95)); padding: 1.5rem 2rem; border-radius: 16px; border: 1px solid #334155;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h1 style="margin: 0; color: #f1f5f9; font-size: 1.6rem; font-family: Georgia, 'Times New Roman', serif; letter-spacing: 0.02em;">North Coast Estate</h1>
            <div style="font-size: 0.85rem; color: #94a3b8; margin-top: 0.25rem;">Mediterranean Resort Management</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 1.1rem; color: #f8fafc; font-weight: 600;">
              Turn <strong id="lbl-turn" style="color: #38bdf8; font-size: 1.3rem;">${turn}</strong> <span style="color: #64748b;">/ 20</span>
            </div>
            <div id="lbl-season" style="font-size: 0.85rem; color: ${phaseColor}; margin-top: 0.25rem; font-weight: 500;">${phase}</div>
          </div>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
          <button id="btn-new" style="background: rgba(71, 85, 105, 0.6); color: #cbd5e1; border: 1px solid #475569; padding: 0.4rem 0.9rem; border-radius: 8px; cursor: pointer; font-size: 0.8rem;">New Game</button>
          <button id="btn-save" style="background: rgba(22, 163, 74, 0.2); color: #4ade80; border: 1px solid rgba(22, 163, 74, 0.4); padding: 0.4rem 0.9rem; border-radius: 8px; cursor: pointer; font-size: 0.8rem;">Save</button>
          <button id="btn-load" style="background: rgba(147, 51, 234, 0.2); color: #c084fc; border: 1px solid rgba(147, 51, 234, 0.4); padding: 0.4rem 0.9rem; border-radius: 8px; cursor: pointer; font-size: 0.8rem;">Load</button>
          <button id="btn-debug-toggle" style="background: rgba(51, 65, 85, 0.4); color: #64748b; border: 1px solid #334155; padding: 0.4rem 0.9rem; border-radius: 8px; cursor: pointer; font-size: 0.8rem;">Engine Ledger</button>
        </div>
      </header>`;
  }

  /* ═══════════════════════════════════════════════════════════
     COMPONENT 3 — StakeholderBand (proportional allocation)
     ═══════════════════════════════════════════════════════════ */
  private renderBandSegments(): string {
    const allocs = this.getAllocationArray(this._currentSnapshot);
    const states = this.getTrustStatesArray(this._currentSnapshot);

    return allocs.map((alloc, i) => {
      const sem = TRUST_SEMANTICS[states[i]] || TRUST_SEMANTICS['Healthy'];
      return `<div style="flex: ${alloc}; background: linear-gradient(180deg, ${STAKEHOLDER_TINTS[i]}22, ${STAKEHOLDER_TINTS[i]}11); border-left: ${i > 0 ? '1px solid #334155' : 'none'}; padding: 0.6rem 0.5rem; min-width: 60px; transition: flex 0.3s ease;"
                   title="${ACTOR_ALIASES[i]}: ${alloc}% allocation, ${states[i]}">
              <div style="font-size: 0.7rem; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${ACTOR_ALIASES[i]}</div>
              <div style="font-size: 1.1rem; font-weight: 700; color: #f1f5f9; font-variant-numeric: tabular-nums;">${alloc}%</div>
              <div style="font-size: 0.75rem; color: ${sem.color}; margin-top: 0.2rem;">
                <span style="font-size: 0.65rem;">${sem.glyph}</span> ${states[i]}
              </div>
            </div>`;
    }).join('');
  }

  private renderStakeholderBand(): string {
    return `
      <section style="max-width: 1100px; margin: 0 auto 1rem; background: rgba(30, 41, 59, 0.6); border-radius: 12px; border: 1px solid #334155; overflow: hidden;">
        <div style="padding: 0.75rem 1rem 0.5rem; font-size: 0.8rem; color: #64748b; display: flex; justify-content: space-between; align-items: center;">
          <span>Stakeholder Allocation Band</span>
          <span style="color: #475569;">Total: 100%</span>
        </div>
        <div id="stakeholder-band" style="display: flex; min-height: 80px; border-top: 1px solid #334155;">
          ${this.renderBandSegments()}
        </div>
      </section>`;
  }

  /* ═══════════════════════════════════════════════════════════
     COMPONENT 5 — DecisionPreview + Decision Panel
     ═══════════════════════════════════════════════════════════ */
  private renderDecisionPanel(): string {
    const allocs = this.getAllocationArray(this._currentSnapshot);

    const sourceOptions = ACTOR_ALIASES.map((name, i) =>
      `<option value="${i}" ${i === 4 ? 'selected' : ''}>${name} (${allocs[i]}%)</option>`
    ).join('');

    const targetOptions = ACTOR_ALIASES.map((name, i) =>
      `<option value="${i}" ${i === 0 ? 'selected' : ''}>${name} (${allocs[i]}%)</option>`
    ).join('');

    return `
      <section style="max-width: 1100px; margin: 0 auto 1rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
        <div style="background: rgba(30, 41, 59, 0.6); padding: 1.25rem; border-radius: 12px; border: 1px solid #334155;">
          <h2 style="margin: 0 0 1rem; color: #f1f5f9; font-size: 1.1rem;">Allocation Transfer</h2>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <div>
              <label for="sel-action" style="font-size: 0.8rem; color: #94a3b8; display: block; margin-bottom: 0.25rem;">Reduce focus on:</label>
              <select id="sel-action" style="width: 100%; background: #0f172a; color: #f8fafc; border: 1px solid #475569; padding: 0.5rem; border-radius: 8px; font-size: 0.9rem;">
                ${sourceOptions}
              </select>
            </div>
            <div>
              <label for="sel-region" style="font-size: 0.8rem; color: #94a3b8; display: block; margin-bottom: 0.25rem;">Increase focus on:</label>
              <select id="sel-region" style="width: 100%; background: #0f172a; color: #f8fafc; border: 1px solid #475569; padding: 0.5rem; border-radius: 8px; font-size: 0.9rem;">
                ${targetOptions}
              </select>
            </div>
            <div>
              <label for="num-amount" style="font-size: 0.8rem; color: #94a3b8; display: block; margin-bottom: 0.25rem;">Transfer amount:</label>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <button id="btn-decrease" style="background: #1e293b; color: #94a3b8; border: 1px solid #475569; width: 36px; height: 36px; border-radius: 8px; cursor: pointer; font-size: 1.1rem;">\u2212</button>
                <input type="number" id="num-amount" value="5" min="1" max="20" style="width: 60px; text-align: center; background: #0f172a; color: #f8fafc; border: 1px solid #475569; padding: 0.5rem; border-radius: 8px; font-size: 1rem; font-variant-numeric: tabular-nums;" />
                <button id="btn-increase" style="background: #1e293b; color: #94a3b8; border: 1px solid #475569; width: 36px; height: 36px; border-radius: 8px; cursor: pointer; font-size: 1.1rem;">+</button>
                <span style="font-size: 0.8rem; color: #64748b;">%</span>
              </div>
            </div>
            <button id="btn-execute" style="background: linear-gradient(135deg, #0284c7, #0369a1); color: #fff; border: none; padding: 0.75rem; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.95rem; margin-top: 0.5rem;">Confirm &amp; Execute Turn</button>
          </div>
        </div>

        <div style="background: rgba(30, 41, 59, 0.6); padding: 1.25rem; border-radius: 12px; border: 1px solid #334155;">
          <h2 style="margin: 0 0 0.75rem; color: #f1f5f9; font-size: 1.1rem;">Allocation Preview</h2>
          <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 0.75rem;">Projected result \u2014 engine outcome is authoritative</div>
          <div id="preview-band" style="display: flex; flex-direction: column; gap: 0.4rem;"></div>
        </div>
      </section>`;
  }

  /* ═══════════════════════════════════════════════════════════
     COMPONENT 6 — BasicDeltaFeedback
     ═══════════════════════════════════════════════════════════ */
  private renderDeltaFeedback(): string {
    if (!this._previousSnapshot) return '';

    const prevAllocs = this.getAllocationArray(this._previousSnapshot);
    const currAllocs = this.getAllocationArray(this._currentSnapshot);
    const prevStates = this.getTrustStatesArray(this._previousSnapshot);
    const currStates = this.getTrustStatesArray(this._currentSnapshot);

    const deltas: string[] = [];

    for (let i = 0; i < 5; i++) {
      const allocChanged = prevAllocs[i] !== currAllocs[i];
      const stateChanged = prevStates[i] !== currStates[i];

      if (!allocChanged && !stateChanged) continue;

      let line = `<div style="background: #1e293b; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center;">`;
      line += `<span style="color: #cbd5e1; font-weight: 500;">${ACTOR_ALIASES[i]}</span>`;
      line += `<span style="display: flex; gap: 1rem; align-items: center;">`;

      if (allocChanged) {
        const diff = currAllocs[i] - prevAllocs[i];
        const diffColor = diff > 0 ? '#4ade80' : '#f87171';
        line += `<span style="color: #94a3b8;">${prevAllocs[i]}%</span>`;
        line += `<span style="color: #64748b;"> \u2192 </span>`;
        line += `<span style="color: ${diffColor}; font-weight: 600;">${currAllocs[i]}%</span>`;
      }

      if (stateChanged) {
        const prevSem = TRUST_SEMANTICS[prevStates[i]] || TRUST_SEMANTICS['Healthy'];
        const currSem = TRUST_SEMANTICS[currStates[i]] || TRUST_SEMANTICS['Healthy'];
        line += `<span style="margin-left: 0.5rem;">`;
        line += `<span style="color: ${prevSem.color};">${prevSem.glyph} ${prevStates[i]}</span>`;
        line += `<span style="color: #64748b; margin: 0 0.25rem;"> \u2192 </span>`;
        line += `<span style="color: ${currSem.color}; font-weight: 600;">${currSem.glyph} ${currStates[i]}</span>`;
        line += `</span>`;
      }

      line += `</span></div>`;
      deltas.push(line);
    }

    if (deltas.length === 0) return '';

    return `
      <section style="max-width: 1100px; margin: 0 auto 1rem; background: rgba(30, 41, 59, 0.6); padding: 1.25rem; border-radius: 12px; border: 1px solid #334155;">
        <h2 style="margin: 0 0 0.75rem; color: #f1f5f9; font-size: 1.1rem;">Turn Results</h2>
        <div style="display: flex; flex-direction: column; gap: 0.35rem;">${deltas.join('')}</div>
      </section>`;
  }

  /* ═══════════════════════════════════════════════════════════
     Turn Events (preserved functionality, uses aliases)
     ═══════════════════════════════════════════════════════════ */
  private renderTurnEventsHTML(): string {
    if (!this._lastTelemetry) return '';
    const { worldChanges, consequences } = this._lastTelemetry;
    if (worldChanges.length === 0 && consequences.length === 0) return '';

    let html = '<section style="max-width: 1100px; margin: 0 auto 1rem; background: rgba(30, 41, 59, 0.6); padding: 1.25rem; border-radius: 12px; border: 1px solid #334155;">';
    html += '<h2 style="margin: 0 0 0.75rem; color: #f1f5f9; font-size: 1.1rem;">Turn Events</h2>';

    if (worldChanges.length > 0) {
      html += '<div style="margin-bottom: 0.75rem;"><div style="font-size: 0.8rem; font-weight: 600; color: #f59e0b; margin-bottom: 0.4rem;">World Changes</div>';
      for (const wc of worldChanges) {
        const from = ACTOR_ALIASES[wc.edgeChanged[0]] || `Actor ${wc.edgeChanged[0]}`;
        const to = ACTOR_ALIASES[wc.edgeChanged[1]] || `Actor ${wc.edgeChanged[1]}`;
        html += `<div style="background: #1e293b; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.85rem; margin-bottom: 0.25rem; border-left: 3px solid #f59e0b;">Turn ${wc.turn}: ${from} \u2192 ${to} influence shift (${wc.previousWeight} \u2192 ${wc.newWeight})</div>`;
      }
      html += '</div>';
    }

    if (consequences.length > 0) {
      html += '<div><div style="font-size: 0.8rem; font-weight: 600; color: #f87171; margin-bottom: 0.4rem;">Consequences</div>';
      for (const c of consequences) {
        const actor = ACTOR_ALIASES[c.actorIndex] || `Actor ${c.actorIndex}`;
        html += `<div style="background: #1e293b; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.85rem; margin-bottom: 0.25rem; border-left: 3px solid #f87171;">Turn ${c.turn}: ${actor} \u2014 ${c.eventId}</div>`;
      }
      html += '</div>';
    }

    html += '</section>';
    return html;
  }

  /* ═══════════════════════════════════════════════════════════
     Decision History (preserved functionality, uses aliases)
     ═══════════════════════════════════════════════════════════ */
  private renderDecisionHistoryHTML(): string {
    if (this._decisionHistory.length === 0) return '';
    return this._decisionHistory.map(entry => {
      const source = ACTOR_ALIASES[entry.sourceIndex] || `Actor ${entry.sourceIndex}`;
      const target = ACTOR_ALIASES[entry.targetIndex] || `Actor ${entry.targetIndex}`;
      return `<div style="background: #1e293b; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.85rem; border-left: 3px solid #38bdf8;">
        <strong style="color: #f8fafc;">Turn ${entry.turnNumber}</strong>
        <span style="color: #94a3b8; margin-left: 0.5rem;">${source} \u2192 ${target} (${entry.amount}%)</span>
      </div>`;
    }).join('');
  }

  /* ═══════════════════════════════════════════════════════════
     COMPONENT 1 — DebugDrawer (collapsed, all diagnostics)
     ═══════════════════════════════════════════════════════════ */
  private renderDebugDrawer(): string {
    const hash = computeStateHash(this._currentSnapshot);
    const explanation = this._currentSnapshot.explanation;
    const scores = this.getTrustScoresArray(this._currentSnapshot);

    const causesHTML = explanation.dominantCauses.slice(0, 3).map((cause, idx) =>
      `<div style="font-size: 0.8rem; color: #94a3b8;">${idx + 1}. ${ACTOR_NAMES[cause.actor_index] || cause.cause_type} (Impact: ${cause.impact})</div>`
    ).join('') || '<div style="font-size: 0.8rem; color: #64748b;">No dominant cause recorded.</div>';

    const scoresHTML = ACTOR_NAMES.map((name, i) =>
      `<div style="font-size: 0.8rem; color: #94a3b8;">${name}: <span style="color: #cbd5e1;">${scores[i]}/100</span></div>`
    ).join('');

    return `
      <section id="debug-drawer" style="max-width: 1100px; margin: 0 auto 1rem; background: rgba(15, 23, 42, 0.8); border-radius: 12px; border: 1px solid #1e293b; overflow: hidden; display: ${this._debugDrawerOpen ? 'block' : 'none'};">
        <div style="padding: 1rem 1.25rem;">
          <div style="font-size: 0.85rem; font-weight: 600; color: #64748b; margin-bottom: 0.75rem;">Engine Ledger \u2014 Diagnostic Information</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
            <div>
              <div style="font-size: 0.75rem; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.4rem;">Runtime</div>
              <div style="font-size: 0.8rem; color: #94a3b8;">Canonical Mode: GST v1.0</div>
              <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 0.25rem;">State Hash:</div>
              <code id="lbl-hash" style="font-size: 0.75rem; color: #a855f7; font-family: monospace; word-break: break-all;">${hash.substring(0, 32)}...</code>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.4rem;">Causal Projection</div>
              <div style="font-size: 0.8rem; color: #94a3b8;">Category: <span id="lbl-category" style="color: #eab308;">${explanation.category}</span></div>
              <div style="font-size: 0.8rem; color: #94a3b8;">Intensity: <span id="lbl-intensity" style="color: #ef4444;">${explanation.intensity}</span></div>
              <div id="causes-list" style="margin-top: 0.4rem;">${causesHTML}</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.4rem;">Raw Trust Scores</div>
              <div id="trust-scores">${scoresHTML}</div>
            </div>
          </div>
        </div>
      </section>`;
  }

  /* ═══════════════════════════════════════════════════════════
     Main Render
     ═══════════════════════════════════════════════════════════ */
  private render(container: HTMLElement): void {
    container.innerHTML = `
      <div style="font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; background: linear-gradient(180deg, #0b1e2a 0%, #0f172a 40%, #1a1a2e 100%); color: #f8fafc; min-height: 100vh; padding: 1.5rem 1rem;">
        ${this.renderResortHeader()}
        ${this.renderStakeholderBand()}
        ${this.renderDecisionPanel()}
        <div id="delta-feedback-container">${this.renderDeltaFeedback()}</div>
        <div id="turn-events-container">${this.renderTurnEventsHTML()}</div>
        <div id="decision-history-container"></div>
        ${this.renderDebugDrawer()}
        <div id="status-banner" style="max-width: 1100px; margin: 0 auto; padding: 0.6rem 1rem; border-radius: 8px; font-size: 0.8rem; color: #64748b; text-align: center;"></div>
      </div>
    `;

    this.bindEvents(container);
    this.updatePreview(container);
  }

  /* ═══════════════════════════════════════════════════════════
     Preview Update (Component 5 — live, client-side only)
     ═══════════════════════════════════════════════════════════ */
  private updatePreview(container: HTMLElement): void {
    const previewBand = container.querySelector('#preview-band') as HTMLElement;
    if (!previewBand) return;

    const selSource = container.querySelector('#sel-action') as HTMLSelectElement;
    const selTarget = container.querySelector('#sel-region') as HTMLSelectElement;
    const numAmount = container.querySelector('#num-amount') as HTMLInputElement;
    if (!selSource || !selTarget || !numAmount) return;

    const sourceIndex = parseInt(selSource.value, 10);
    const targetIndex = parseInt(selTarget.value, 10);
    const amount = Math.max(1, Math.min(20, parseInt(numAmount.value || '5', 10)));

    const allocs = this.getAllocationArray(this._currentSnapshot);
    const states = this.getTrustStatesArray(this._currentSnapshot);

    // Client-side preview: source decreases, target increases
    const preview = [...allocs];
    if (sourceIndex !== targetIndex) {
      const transfer = Math.min(amount, preview[sourceIndex]);
      preview[sourceIndex] -= transfer;
      preview[targetIndex] += transfer;
    }

    previewBand.innerHTML = preview.map((alloc, i) => {
      const original = allocs[i];
      const diff = alloc - original;
      const sem = TRUST_SEMANTICS[states[i]] || TRUST_SEMANTICS['Healthy'];
      let diffHTML = '';
      if (diff !== 0) {
        const diffColor = diff > 0 ? '#4ade80' : '#f87171';
        diffHTML = `<span style="color: ${diffColor}; font-size: 0.8rem; font-weight: 600; margin-left: 0.5rem;">${diff > 0 ? '+' : ''}${diff}%</span>`;
      }
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.6rem; background: ${diff !== 0 ? 'rgba(56, 189, 248, 0.05)' : 'transparent'}; border-radius: 6px; border-left: 3px solid ${diff !== 0 ? (diff > 0 ? '#4ade80' : '#f87171') : 'transparent'};">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 0.8rem; color: ${sem.color};">${sem.glyph}</span>
            <span style="font-size: 0.85rem; color: #cbd5e1;">${ACTOR_ALIASES[i]}</span>
          </div>
          <div>
            <span style="font-size: 0.9rem; color: #f1f5f9; font-weight: 600; font-variant-numeric: tabular-nums;">${alloc}%</span>
            ${diffHTML}
          </div>
        </div>`;
    }).join('');
  }

  /* ═══════════════════════════════════════════════════════════
     Event Binding
     ═══════════════════════════════════════════════════════════ */
  private bindEvents(container: HTMLElement): void {
    const btnExecute = container.querySelector('#btn-execute') as HTMLButtonElement;
    const btnNew = container.querySelector('#btn-new') as HTMLButtonElement;
    const btnSave = container.querySelector('#btn-save') as HTMLButtonElement;
    const btnLoad = container.querySelector('#btn-load') as HTMLButtonElement;
    const btnDebugToggle = container.querySelector('#btn-debug-toggle') as HTMLButtonElement;
    const statusBanner = container.querySelector('#status-banner') as HTMLElement;
    const btnDecrease = container.querySelector('#btn-decrease') as HTMLButtonElement;
    const btnIncrease = container.querySelector('#btn-increase') as HTMLButtonElement;
    const numAmount = container.querySelector('#num-amount') as HTMLInputElement;
    const selSource = container.querySelector('#sel-action') as HTMLSelectElement;
    const selTarget = container.querySelector('#sel-region') as HTMLSelectElement;

    // Preview auto-update on any input change
    const onPreviewChange = (): void => this.updatePreview(container);
    selSource?.addEventListener('change', onPreviewChange);
    selTarget?.addEventListener('change', onPreviewChange);
    numAmount?.addEventListener('input', onPreviewChange);

    // Stepper buttons
    btnDecrease?.addEventListener('click', () => {
      const current = parseInt(numAmount.value || '5', 10);
      numAmount.value = Math.max(1, current - 1).toString();
      onPreviewChange();
    });

    btnIncrease?.addEventListener('click', () => {
      const current = parseInt(numAmount.value || '5', 10);
      numAmount.value = Math.min(20, current + 1).toString();
      onPreviewChange();
    });

    // Execute Turn
    btnExecute?.addEventListener('click', () => {
      const sourceIndex = parseInt(selSource.value, 10);
      const targetIndex = parseInt(selTarget.value, 10);
      const amount = Math.max(1, parseInt(numAmount.value || '5', 10));

      // Compute preview for mismatch detection (Component 5)
      const previewAllocs = [...this.getAllocationArray(this._currentSnapshot)];
      if (sourceIndex !== targetIndex) {
        const transfer = Math.min(amount, previewAllocs[sourceIndex]);
        previewAllocs[sourceIndex] -= transfer;
        previewAllocs[targetIndex] += transfer;
      }

      // Store previous snapshot for delta feedback (Component 6)
      this._previousSnapshot = this._currentSnapshot;

      const turnResult = this._processTurnUseCase.execute(this._currentSnapshot, {
        sourceIndex,
        targetIndex,
        amount
      });

      this._currentSnapshot = turnResult.snapshot;
      this._lastTelemetry = turnResult.telemetry;
      this._decisionHistory.push({
        turnNumber: this._currentSnapshot.turnNumber - 1,
        sourceIndex,
        targetIndex,
        amount
      });

      // Preview mismatch detection (Component 5)
      const actualAllocs = this.getAllocationArray(this._currentSnapshot);
      const mismatch = previewAllocs.some((v, i) => v !== actualAllocs[i]);
      if (mismatch) {
        console.warn('PREVIEW_MISMATCH_DETECTED', { preview: previewAllocs, actual: actualAllocs });
      }

      this.updateUI(container);
      statusBanner.textContent = `Turn executed: ${ACTOR_ALIASES[sourceIndex]} \u2192 ${ACTOR_ALIASES[targetIndex]} (${amount}%)`;
      statusBanner.style.color = '#38bdf8';
    });

    // New Game
    btnNew?.addEventListener('click', () => {
      this._currentSnapshot = this._startGameUseCase.execute();
      this._lastTelemetry = undefined;
      this._previousSnapshot = undefined;
      this._decisionHistory.length = 0;
      this.updateUI(container);
      statusBanner.textContent = 'New game started \u2014 Early Season, Turn 1.';
      statusBanner.style.color = '#4ade80';
    });

    // Save
    btnSave?.addEventListener('click', async () => {
      const success = await this._saveGameUseCase.execute(this._currentSnapshot);
      if (success) {
        statusBanner.textContent = 'Game saved successfully.';
        statusBanner.style.color = '#4ade80';
      } else {
        statusBanner.textContent = 'Save failed.';
        statusBanner.style.color = '#f87171';
      }
    });

    // Load
    btnLoad?.addEventListener('click', async () => {
      const loadedSnapshot = await this._loadGameUseCase.execute();
      if (loadedSnapshot) {
        this._currentSnapshot = loadedSnapshot;
        this._lastTelemetry = undefined;
        this._previousSnapshot = undefined;
        this._decisionHistory.length = 0;
        this.updateUI(container);
        statusBanner.textContent = `Loaded save at Turn ${this._currentSnapshot.turnNumber}.`;
        statusBanner.style.color = '#c084fc';
      } else {
        statusBanner.textContent = 'No save found.';
        statusBanner.style.color = '#f59e0b';
      }
    });

    // Debug Drawer Toggle (Component 1)
    btnDebugToggle?.addEventListener('click', () => {
      this._debugDrawerOpen = !this._debugDrawerOpen;
      const drawer = container.querySelector('#debug-drawer') as HTMLElement;
      if (drawer) {
        drawer.style.display = this._debugDrawerOpen ? 'block' : 'none';
      }
      btnDebugToggle.style.color = this._debugDrawerOpen ? '#a855f7' : '#64748b';
      btnDebugToggle.style.borderColor = this._debugDrawerOpen ? 'rgba(168, 85, 247, 0.4)' : '#334155';
    });
  }

  /* ═══════════════════════════════════════════════════════════
     UI Update (refreshes all dynamic regions)
     ═══════════════════════════════════════════════════════════ */
  private updateUI(container: HTMLElement): void {
    const turn = this._currentSnapshot.turnNumber;
    const phase = getSeasonPhase(turn);
    const phaseColor = getSeasonColor(turn);

    // Header (Component 2)
    const lblTurn = container.querySelector('#lbl-turn') as HTMLElement;
    const lblSeason = container.querySelector('#lbl-season') as HTMLElement;
    if (lblTurn) lblTurn.textContent = turn.toString();
    if (lblSeason) {
      lblSeason.textContent = phase;
      lblSeason.style.color = phaseColor;
    }

    // Stakeholder Band (Component 3)
    const bandContainer = container.querySelector('#stakeholder-band') as HTMLElement;
    if (bandContainer) bandContainer.innerHTML = this.renderBandSegments();

    // Update dropdown labels to show current allocations
    const selSource = container.querySelector('#sel-action') as HTMLSelectElement;
    const selTarget = container.querySelector('#sel-region') as HTMLSelectElement;
    if (selSource && selTarget) {
      const allocs = this.getAllocationArray(this._currentSnapshot);
      const sourceVal = selSource.value;
      const targetVal = selTarget.value;

      selSource.innerHTML = ACTOR_ALIASES.map((name, i) =>
        `<option value="${i}" ${i.toString() === sourceVal ? 'selected' : ''}>${name} (${allocs[i]}%)</option>`
      ).join('');

      selTarget.innerHTML = ACTOR_ALIASES.map((name, i) =>
        `<option value="${i}" ${i.toString() === targetVal ? 'selected' : ''}>${name} (${allocs[i]}%)</option>`
      ).join('');
    }

    // Delta Feedback (Component 6)
    const deltaContainer = container.querySelector('#delta-feedback-container') as HTMLElement;
    if (deltaContainer) deltaContainer.innerHTML = this.renderDeltaFeedback();

    // Turn Events
    const turnEventsContainer = container.querySelector('#turn-events-container') as HTMLElement;
    if (turnEventsContainer) turnEventsContainer.innerHTML = this.renderTurnEventsHTML();

    // Decision History
    const historyContainer = container.querySelector('#decision-history-container') as HTMLElement;
    if (historyContainer && this._decisionHistory.length > 0) {
      historyContainer.innerHTML = `
        <section style="max-width: 1100px; margin: 0 auto 1rem; background: rgba(30, 41, 59, 0.6); padding: 1.25rem; border-radius: 12px; border: 1px solid #334155;">
          <h2 style="margin: 0 0 0.75rem; color: #f1f5f9; font-size: 1.1rem;">Decision History</h2>
          <div id="decision-history-list" style="max-height: 250px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.35rem;">${this.renderDecisionHistoryHTML()}</div>
        </section>`;
    }

    // Debug Drawer (Component 1)
    if (this._debugDrawerOpen) {
      const debugDrawer = container.querySelector('#debug-drawer') as HTMLElement;
      if (debugDrawer) {
        const hash = computeStateHash(this._currentSnapshot);
        const explanation = this._currentSnapshot.explanation;
        const scores = this.getTrustScoresArray(this._currentSnapshot);

        const lblHash = debugDrawer.querySelector('#lbl-hash') as HTMLElement;
        const lblCategory = debugDrawer.querySelector('#lbl-category') as HTMLElement;
        const lblIntensity = debugDrawer.querySelector('#lbl-intensity') as HTMLElement;
        const causesList = debugDrawer.querySelector('#causes-list') as HTMLElement;
        const trustScoresEl = debugDrawer.querySelector('#trust-scores') as HTMLElement;

        if (lblHash) lblHash.textContent = `${hash.substring(0, 32)}...`;
        if (lblCategory) lblCategory.textContent = explanation.category;
        if (lblIntensity) lblIntensity.textContent = explanation.intensity;
        if (causesList) {
          causesList.innerHTML = explanation.dominantCauses.slice(0, 3).map((cause, idx) =>
            `<div style="font-size: 0.8rem; color: #94a3b8;">${idx + 1}. ${ACTOR_NAMES[cause.actor_index] || cause.cause_type} (Impact: ${cause.impact})</div>`
          ).join('') || '<div style="font-size: 0.8rem; color: #64748b;">No dominant cause recorded.</div>';
        }
        if (trustScoresEl) {
          trustScoresEl.innerHTML = ACTOR_NAMES.map((name, i) =>
            `<div style="font-size: 0.8rem; color: #94a3b8;">${name}: <span style="color: #cbd5e1;">${scores[i]}/100</span></div>`
          ).join('');
        }
      }
    }

    // Update preview (Component 5)
    this.updatePreview(container);
  }
}
