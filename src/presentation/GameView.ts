import { StartGameUseCase } from '../application/usecases/StartGameUseCase';
import { ProcessTurnUseCase } from '../application/usecases/ProcessTurnUseCase';
import { SaveGameUseCase } from '../application/usecases/SaveGameUseCase';
import { LoadGameUseCase } from '../application/usecases/LoadGameUseCase';
import { IndexedDBStorageAdapter } from '../infrastructure/persistence/IndexedDBStorageAdapter';
import { GameStateSnapshotDTO } from '../application/dtos/Snapshots';
import { computeStateHash } from '../application/services/CanonicalHashService';

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

const ACTOR_NAMES = [
  "State Administration",
  "Investors",
  "Security Establishment",
  "Local Communities",
  "Media"
];

export class GameView {
  private _currentSnapshot: GameStateSnapshotDTO;
  private readonly _startGameUseCase: StartGameUseCase;
  private readonly _processTurnUseCase: ProcessTurnUseCase;
  private readonly _saveGameUseCase: SaveGameUseCase;
  private readonly _loadGameUseCase: LoadGameUseCase;

  constructor(containerElement: HTMLElement) {
    const persistenceAdapter = new IndexedDBStorageAdapter();

    this._startGameUseCase = new StartGameUseCase();
    this._processTurnUseCase = new ProcessTurnUseCase();
    this._saveGameUseCase = new SaveGameUseCase(persistenceAdapter);
    this._loadGameUseCase = new LoadGameUseCase(persistenceAdapter);

    this._currentSnapshot = this._startGameUseCase.execute();

    this.render(containerElement);
  }

  private render(container: HTMLElement): void {
    container.innerHTML = `
      <div style="font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; min-height: 100vh; padding: 2rem;">
        <header style="max-width: 1000px; margin: 0 auto 2rem; background: rgba(30, 41, 59, 0.8); padding: 1.5rem; border-radius: 12px; border: 1px solid #334155;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h1 style="margin: 0; color: #38bdf8; font-size: 1.75rem;">SHADOW STATE — Canonical Engine Runtime (GST v1.0)</h1>
            <span style="background: #16a34a; color: #fff; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.85rem; font-weight: bold;">Canonical Mode</span>
          </div>
          <div style="display: flex; gap: 2rem; font-size: 0.95rem; color: #94a3b8; margin-top: 1rem;">
            <span>Turn: <strong id="lbl-turn" style="color: #f8fafc;">${this._currentSnapshot.turnNumber}</strong></span>
            <span>State Hash: <code id="lbl-hash" style="color: #a855f7; font-family: monospace;">${computeStateHash(this._currentSnapshot).substring(0, 16)}...</code></span>
          </div>
        </header>

        <main style="max-width: 1000px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
          <!-- 5 Actors Vector & Trust Status -->
          <section style="background: rgba(30, 41, 59, 0.6); padding: 1.5rem; border-radius: 12px; border: 1px solid #334155;">
            <h2 style="margin-top: 0; color: #f1f5f9; font-size: 1.25rem;">Actor Allocation & Trust Status</h2>
            <div id="actors-container" style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem;">
              ${this.renderActorsHTML()}
            </div>
          </section>

          <!-- Controls & Causal Explanation -->
          <section style="background: rgba(30, 41, 59, 0.6); padding: 1.5rem; border-radius: 12px; border: 1px solid #334155; display: flex; flex-direction: column; gap: 1rem;">
            <h2 style="margin-top: 0; color: #f1f5f9; font-size: 1.25rem;">Allocation Command Selection</h2>
            
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <label for="sel-action" style="font-size: 0.9rem; color: #94a3b8;">Source Actor (Take From):</label>
              <select id="sel-action" style="background: #0f172a; color: #f8fafc; border: 1px solid #475569; padding: 0.5rem; border-radius: 6px;">
                <option value="4">Media (Actor 4)</option>
                <option value="0">State Administration (Actor 0)</option>
                <option value="1">Investors (Actor 1)</option>
                <option value="2">Security Establishment (Actor 2)</option>
                <option value="3">Local Communities (Actor 3)</option>
              </select>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <label for="sel-region" style="font-size: 0.9rem; color: #94a3b8;">Target Actor (Give To):</label>
              <select id="sel-region" style="background: #0f172a; color: #f8fafc; border: 1px solid #475569; padding: 0.5rem; border-radius: 6px;">
                <option value="0">State Administration (Actor 0)</option>
                <option value="1">Investors (Actor 1)</option>
                <option value="2">Security Establishment (Actor 2)</option>
                <option value="3">Local Communities (Actor 3)</option>
                <option value="4">Media (Actor 4)</option>
              </select>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <label for="num-amount" style="font-size: 0.9rem; color: #94a3b8;">Allocation Transfer Amount:</label>
              <input type="number" id="num-amount" value="5" min="1" max="20" style="background: #0f172a; color: #f8fafc; border: 1px solid #475569; padding: 0.5rem; border-radius: 6px;" />
            </div>

            <button id="btn-execute" style="background: #0284c7; color: #fff; border: none; padding: 0.75rem; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 0.5rem;">Confirm & Execute Turn</button>

            <!-- Causal Explanation Panel -->
            <div id="explanation-panel" style="background: #0f172a; padding: 1rem; border-radius: 8px; border: 1px solid #0284c7; display: flex; flex-direction: column; gap: 0.5rem;">
              <div style="font-size: 0.95rem; font-weight: bold; color: #38bdf8;">Causal Explanation Projection</div>
              <div style="display: flex; gap: 1rem; font-size: 0.85rem;">
                <span>Category: <strong id="lbl-category" style="color: #eab308;">${this._currentSnapshot.explanation.category}</strong></span>
                <span>Intensity: <strong id="lbl-intensity" style="color: #ef4444;">${this._currentSnapshot.explanation.intensity}</strong></span>
              </div>
              <div id="causes-list" style="font-size: 0.8rem; color: #94a3b8; margin-top: 0.25rem;">
                ${this.renderCausesHTML()}
              </div>
            </div>

            <hr style="border-color: #334155; margin: 0.5rem 0; width: 100%;" />

            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button id="btn-new" style="background: #475569; color: #fff; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; flex: 1;">New Game</button>
              <button id="btn-save" style="background: #16a34a; color: #fff; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; flex: 1;">Save</button>
              <button id="btn-load" style="background: #9333ea; color: #fff; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; flex: 1;">Load</button>
            </div>

            <div id="status-banner" style="background: #1e293b; padding: 0.75rem; border-radius: 6px; border: 1px solid #475569; font-size: 0.85rem; color: #38bdf8; min-height: 2.5rem;">
              Canonical GST runtime ready.
            </div>
          </section>
        </main>
      </div>
    `;

    this.bindEvents(container);
  }

  private renderActorsHTML(): string {
    const alloc = this._currentSnapshot.allocation;
    const trust = this._currentSnapshot.trust;

    const values = [
      { name: "State Administration", index: 0, alloc: alloc.stateAdministration, score: trust.scores.stateAdministration, state: trust.states.stateAdministration },
      { name: "Investors", index: 1, alloc: alloc.investors, score: trust.scores.investors, state: trust.states.investors },
      { name: "Security Establishment", index: 2, alloc: alloc.securityEstablishment, score: trust.scores.securityEstablishment, state: trust.states.securityEstablishment },
      { name: "Local Communities", index: 3, alloc: alloc.localCommunities, score: trust.scores.localCommunities, state: trust.states.localCommunities },
      { name: "Media", index: 4, alloc: alloc.media, score: trust.scores.media, state: trust.states.media }
    ];

    return values.map(item => {
      let badgeColor = "#16a34a"; // Healthy
      if (item.state === "Unstable") badgeColor = "#eab308";
      if (item.state === "Hostile") badgeColor = "#ef4444";

      return `
        <div style="background: #1e293b; padding: 0.75rem 1rem; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: #f8fafc; font-size: 0.95rem;">${item.name}</strong>
            <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 0.15rem;">Allocation: <span style="color: #38bdf8; font-weight: bold;">${item.alloc}%</span></div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.9rem; font-weight: bold; color: #cbd5e1;">Trust: ${item.score}/100</div>
            <span style="background: ${badgeColor}; color: #fff; font-size: 0.75rem; padding: 0.15rem 0.5rem; border-radius: 9999px; display: inline-block; margin-top: 0.25rem;">${item.state}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  private renderCausesHTML(): string {
    const causes = this._currentSnapshot.explanation.dominantCauses;
    if (!causes || causes.length === 0) {
      return "No dominant cause recorded.";
    }

    return causes.slice(0, 3).map((cause, idx) => `
      <div>${idx + 1}. <strong>${ACTOR_NAMES[cause.actor_index] || cause.cause_type}</strong> (Impact: ${cause.impact})</div>
    `).join('');
  }

  private bindEvents(container: HTMLElement): void {
    const btnExecute = container.querySelector('#btn-execute') as HTMLButtonElement;
    const btnNew = container.querySelector('#btn-new') as HTMLButtonElement;
    const btnSave = container.querySelector('#btn-save') as HTMLButtonElement;
    const btnLoad = container.querySelector('#btn-load') as HTMLButtonElement;
    const statusBanner = container.querySelector('#status-banner') as HTMLElement;

    btnExecute?.addEventListener('click', () => {
      const selSource = container.querySelector('#sel-action') as HTMLSelectElement;
      const selTarget = container.querySelector('#sel-region') as HTMLSelectElement;
      const numAmount = container.querySelector('#num-amount') as HTMLInputElement;

      const sourceIndex = parseInt(selSource.value, 10);
      const targetIndex = parseInt(selTarget.value, 10);
      const amount = Math.max(1, parseInt(numAmount.value || '5', 10));

      const turnResult = this._processTurnUseCase.execute(this._currentSnapshot, {
        sourceIndex,
        targetIndex,
        amount
      });

      this._currentSnapshot = turnResult.snapshot;
      this.updateUI(container);
      statusBanner.textContent = `Turn executed: Moved ${amount}% from ${ACTOR_NAMES[sourceIndex]} to ${ACTOR_NAMES[targetIndex]}. Hash: ${turnResult.stateHash.substring(0, 16)}...`;
    });

    btnNew?.addEventListener('click', () => {
      this._currentSnapshot = this._startGameUseCase.execute();
      this.updateUI(container);
      statusBanner.textContent = `New Game initialized at Turn 1.`;
    });

    btnSave?.addEventListener('click', async () => {
      const success = await this._saveGameUseCase.execute(this._currentSnapshot);
      const hash = computeStateHash(this._currentSnapshot);
      if (success) {
        statusBanner.textContent = `Saved successfully! Hash: ${hash.substring(0, 16)}...`;
      } else {
        statusBanner.textContent = `Save failed.`;
      }
    });

    btnLoad?.addEventListener('click', async () => {
      const loadedSnapshot = await this._loadGameUseCase.execute();
      if (loadedSnapshot) {
        this._currentSnapshot = loadedSnapshot;
        this.updateUI(container);
        const hash = computeStateHash(this._currentSnapshot);
        statusBanner.textContent = `Loaded save at Turn ${this._currentSnapshot.turnNumber}. Hash: ${hash.substring(0, 16)}...`;
      } else {
        statusBanner.textContent = `No save found.`;
      }
    });
  }

  private updateUI(container: HTMLElement): void {
    const lblTurn = container.querySelector('#lbl-turn') as HTMLElement;
    const lblHash = container.querySelector('#lbl-hash') as HTMLElement;
    const actorsContainer = container.querySelector('#actors-container') as HTMLElement;
    const lblCategory = container.querySelector('#lbl-category') as HTMLElement;
    const lblIntensity = container.querySelector('#lbl-intensity') as HTMLElement;
    const causesList = container.querySelector('#causes-list') as HTMLElement;

    if (lblTurn) lblTurn.textContent = this._currentSnapshot.turnNumber.toString();
    if (lblHash) lblHash.textContent = `${computeStateHash(this._currentSnapshot).substring(0, 16)}...`;
    if (actorsContainer) actorsContainer.innerHTML = this.renderActorsHTML();
    if (lblCategory) lblCategory.textContent = this._currentSnapshot.explanation.category;
    if (lblIntensity) lblIntensity.textContent = this._currentSnapshot.explanation.intensity;
    if (causesList) causesList.innerHTML = this.renderCausesHTML();
  }
}
