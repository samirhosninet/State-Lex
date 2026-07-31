import { ValidActionType } from '../domain/entities/TurnAction';
import { ValidRegionId } from '../domain/values/RegionId';
import { StartGameUseCase } from '../application/usecases/StartGameUseCase';
import { ProcessTurnUseCase } from '../application/usecases/ProcessTurnUseCase';
import { SaveGameUseCase } from '../application/usecases/SaveGameUseCase';
import { LoadGameUseCase } from '../application/usecases/LoadGameUseCase';
import { IndexedDBStorageAdapter } from '../infrastructure/persistence/IndexedDBStorageAdapter';
import { GameStateSnapshotDTO } from '../application/dtos/Snapshots';
import { computeStateHash } from '../application/services/CanonicalHashService';

export interface HumanPilotTelemetryRecord {
  readonly playerIndex: number;
  readonly turnNumber: number;
  readonly money: number;
  readonly influence: number;
  readonly security: number;
  readonly controlledRegions: string[];
  readonly choice: "DEVELOP_MONEY" | "DEVELOP_INFLUENCE" | "FORTIFY" | "REDEPLOY";
  readonly reasonCode: "A" | "B" | "C" | "D" | "E";
  readonly reasonText?: string;
  readonly decisionTimeMs: number;
}

export class GameView {
  private _currentSnapshot: GameStateSnapshotDTO;
  private readonly _startGameUseCase: StartGameUseCase;
  private readonly _processTurnUseCase: ProcessTurnUseCase;
  private readonly _saveGameUseCase: SaveGameUseCase;
  private readonly _loadGameUseCase: LoadGameUseCase;

  private _pilotLogs: HumanPilotTelemetryRecord[] = [];
  private _turnStartTime: number = Date.now();
  private _currentPlayerIndex: number = 1;

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
            <h1 style="margin: 0; color: #38bdf8; font-size: 1.75rem;">SHADOW STATE — Human Pilot Playtest Mode</h1>
            <span style="background: #0284c7; color: #fff; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.85rem; font-weight: bold;">Pilot #${this._currentPlayerIndex}</span>
          </div>
          <div style="display: flex; gap: 2rem; font-size: 0.95rem; color: #94a3b8; margin-top: 1rem;">
            <span>Turn: <strong id="lbl-turn" style="color: #f8fafc;">${this._currentSnapshot.turnNumber}</strong></span>
            <span>Player: <strong style="color: #38bdf8;">FACTION_ALPHA</strong></span>
            <span>State Hash: <code id="lbl-hash" style="color: #a855f7; font-family: monospace;">${computeStateHash(this._currentSnapshot).substring(0, 16)}...</code></span>
          </div>
        </header>

        <main style="max-width: 1000px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
          <!-- Faction & Region Status -->
          <section style="background: rgba(30, 41, 59, 0.6); padding: 1.5rem; border-radius: 12px; border: 1px solid #334155;">
            <h2 style="margin-top: 0; color: #f1f5f9; font-size: 1.25rem;">World View</h2>
            <div id="regions-container" style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem;">
              ${this.renderRegionsHTML()}
            </div>
            <h3 style="margin-top: 0; color: #cbd5e1; font-size: 1rem;">Faction Pools</h3>
            <div id="factions-container" style="display: flex; gap: 1rem;">
              ${this.renderFactionsHTML()}
            </div>
          </section>

          <!-- Player Controls & Reason Logger -->
          <section style="background: rgba(30, 41, 59, 0.6); padding: 1.5rem; border-radius: 12px; border: 1px solid #334155; display: flex; flex-direction: column; gap: 1rem;">
            <h2 style="margin-top: 0; color: #f1f5f9; font-size: 1.25rem;">Command Selection</h2>
            
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <label for="sel-action" style="font-size: 0.9rem; color: #94a3b8;">Action Type:</label>
              <select id="sel-action" style="background: #0f172a; color: #f8fafc; border: 1px solid #475569; padding: 0.5rem; border-radius: 6px;">
                <option value="DEVELOP_MONEY">DEVELOP → Money (+Capital)</option>
                <option value="DEVELOP_INFLUENCE">DEVELOP → Influence (+Influence Points)</option>
                <option value="FORTIFY">FORTIFY (Spend Influence → Gain Security)</option>
                <option value="REDEPLOY">REDEPLOY (Takeover Target Region)</option>
              </select>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <label for="sel-region" style="font-size: 0.9rem; color: #94a3b8;">Target Region:</label>
              <select id="sel-region" style="background: #0f172a; color: #f8fafc; border: 1px solid #475569; padding: 0.5rem; border-radius: 6px;">
                <option value="EL_ALAMEIN">EL_ALAMEIN</option>
                <option value="RAS_EL_HEKMA">RAS_EL_HEKMA</option>
              </select>
            </div>

            <!-- Decision Reason Logger Modal/Buttons (Appears on Choice) -->
            <div id="reason-logger" style="background: #0f172a; padding: 1rem; border-radius: 8px; border: 1px solid #0284c7; display: flex; flex-direction: column; gap: 0.75rem;">
              <div style="font-size: 0.9rem; font-weight: bold; color: #38bdf8;">Select Decision Reason Code:</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                <button class="btn-reason" data-reason="A" style="background: #1e293b; color: #f8fafc; border: 1px solid #475569; padding: 0.5rem; border-radius: 6px; cursor: pointer; text-align: left; font-size: 0.8rem;">A: Need Money</button>
                <button class="btn-reason" data-reason="B" style="background: #1e293b; color: #f8fafc; border: 1px solid #475569; padding: 0.5rem; border-radius: 6px; cursor: pointer; text-align: left; font-size: 0.8rem;">B: Need Influence</button>
                <button class="btn-reason" data-reason="C" style="background: #1e293b; color: #f8fafc; border: 1px solid #475569; padding: 0.5rem; border-radius: 6px; cursor: pointer; text-align: left; font-size: 0.8rem;">C: Need Security</button>
                <button class="btn-reason" data-reason="D" style="background: #1e293b; color: #f8fafc; border: 1px solid #475569; padding: 0.5rem; border-radius: 6px; cursor: pointer; text-align: left; font-size: 0.8rem;">D: Future Plan</button>
                <button class="btn-reason" data-reason="E" style="background: #1e293b; color: #f8fafc; border: 1px solid #475569; padding: 0.5rem; border-radius: 6px; cursor: pointer; text-align: left; font-size: 0.8rem; grid-column: span 2;">E: Emergency Reaction</button>
              </div>
              <input type="text" id="txt-reason" placeholder="Brief reason (optional)" style="background: #1e293b; border: 1px solid #475569; color: #fff; padding: 0.4rem; border-radius: 4px; font-size: 0.8rem;" />
            </div>

            <button id="btn-execute" style="background: #0284c7; color: #fff; border: none; padding: 0.75rem; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 0.5rem;">Confirm & Execute Turn</button>

            <hr style="border-color: #334155; margin: 0.5rem 0; width: 100%;" />

            <div style="display: flex; gap: 0.5rem;">
              <button id="btn-new" style="background: #475569; color: #fff; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; flex: 1;">New Game</button>
              <button id="btn-save" style="background: #16a34a; color: #fff; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; flex: 1;">Save</button>
              <button id="btn-load" style="background: #9333ea; color: #fff; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; flex: 1;">Load</button>
            </div>

            <div id="status-banner" style="background: #1e293b; padding: 0.75rem; border-radius: 6px; border: 1px solid #475569; font-size: 0.85rem; color: #38bdf8; min-height: 2.5rem;">
              Human Pilot session active. Make decision and select Reason Code A-E.
            </div>
          </section>
        </main>
      </div>
    `;

    this.bindEvents(container);
  }

  private renderRegionsHTML(): string {
    let html = '';
    for (const key of Object.keys(this._currentSnapshot.regions).sort()) {
      const region = this._currentSnapshot.regions[key];
      html += `
        <div style="background: #1e293b; padding: 1rem; border-radius: 8px; border-left: 4px solid ${region.controllerFactionId === 'FACTION_ALPHA' ? '#38bdf8' : '#f43f5e'};">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <strong>${region.name} (${region.id})</strong>
            <span style="font-size: 0.85rem; color: ${region.controllerFactionId === 'FACTION_ALPHA' ? '#38bdf8' : '#f43f5e'};">${region.controllerFactionId}</span>
          </div>
          <div style="font-size: 0.85rem; color: #cbd5e1; display: flex; gap: 1.5rem;">
            <span>Infra: ${region.infrastructureLevel}/10</span>
            <span>Defense: ${region.defenseLevel}/10</span>
          </div>
        </div>
      `;
    }
    return html;
  }

  private renderFactionsHTML(): string {
    let html = '';
    for (const key of Object.keys(this._currentSnapshot.factions).sort()) {
      const faction = this._currentSnapshot.factions[key];
      const units = Number(BigInt(faction.resources.baseUnits.replace('n', ''))) / 100;
      html += `
        <div style="background: #1e293b; padding: 0.75rem 1rem; border-radius: 8px; flex: 1;">
          <div style="font-size: 0.8rem; color: #94a3b8;">${faction.name}</div>
          <div style="font-size: 1.1rem; font-weight: bold; color: #f8fafc;">${units} units</div>
        </div>
      `;
    }
    return html;
  }

  private bindEvents(container: HTMLElement): void {
    const btnExecute = container.querySelector('#btn-execute') as HTMLButtonElement;
    const btnNew = container.querySelector('#btn-new') as HTMLButtonElement;
    const btnSave = container.querySelector('#btn-save') as HTMLButtonElement;
    const btnLoad = container.querySelector('#btn-load') as HTMLButtonElement;
    const statusBanner = container.querySelector('#status-banner') as HTMLElement;
    const txtReason = container.querySelector('#txt-reason') as HTMLInputElement;

    let selectedReasonCode: "A" | "B" | "C" | "D" | "E" = "A";

    const reasonButtons = container.querySelectorAll('.btn-reason');
    reasonButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        reasonButtons.forEach(b => (b as HTMLElement).style.borderColor = '#475569');
        const target = e.currentTarget as HTMLElement;
        target.style.borderColor = '#38bdf8';
        selectedReasonCode = target.getAttribute('data-reason') as "A" | "B" | "C" | "D" | "E";
      });
    });

    btnExecute?.addEventListener('click', () => {
      const selAction = container.querySelector('#sel-action') as HTMLSelectElement;
      const selRegion = container.querySelector('#sel-region') as HTMLSelectElement;

      const choiceVal = selAction.value;
      const targetRegionId = selRegion.value as ValidRegionId;

      let actionType: ValidActionType = "DEVELOP";
      let choiceType: "DEVELOP_MONEY" | "DEVELOP_INFLUENCE" | "FORTIFY" | "REDEPLOY" = "DEVELOP_MONEY";

      if (choiceVal === "DEVELOP_MONEY") {
        actionType = "DEVELOP";
        choiceType = "DEVELOP_MONEY";
      } else if (choiceVal === "DEVELOP_INFLUENCE") {
        actionType = "DEVELOP";
        choiceType = "DEVELOP_INFLUENCE";
      } else if (choiceVal === "FORTIFY") {
        actionType = "FORTIFY";
        choiceType = "FORTIFY";
      } else if (choiceVal === "REDEPLOY") {
        actionType = "REDEPLOY";
        choiceType = "REDEPLOY";
      }

      const decisionTimeMs = Date.now() - this._turnStartTime;

      // Track Telemetry Record
      const record: HumanPilotTelemetryRecord = {
        playerIndex: this._currentPlayerIndex,
        turnNumber: this._currentSnapshot.turnNumber,
        money: Number(BigInt(this._currentSnapshot.factions["FACTION_ALPHA"]?.resources.baseUnits.replace('n', '') || "0")) / 100,
        influence: 20,
        security: this._currentSnapshot.regions["EL_ALAMEIN"]?.defenseLevel || 1,
        controlledRegions: Object.keys(this._currentSnapshot.regions).filter(k => this._currentSnapshot.regions[k].controllerFactionId === "FACTION_ALPHA"),
        choice: choiceType,
        reasonCode: selectedReasonCode,
        reasonText: txtReason?.value || "",
        decisionTimeMs
      };

      this._pilotLogs.push(record);

      const turnResult = this._processTurnUseCase.execute(this._currentSnapshot, {
        actionType,
        targetRegionId
      });

      this._currentSnapshot = turnResult.snapshot;
      this._turnStartTime = Date.now();
      if (txtReason) txtReason.value = '';

      this.updateUI(container);
      statusBanner.textContent = `Turn ${this._currentSnapshot.turnNumber - 1} executed (Choice: ${choiceType}, Reason: ${selectedReasonCode}, Time: ${decisionTimeMs}ms). Hash: ${turnResult.stateHash.substring(0, 16)}...`;
    });

    btnNew?.addEventListener('click', () => {
      this._currentSnapshot = this._startGameUseCase.execute();
      this._turnStartTime = Date.now();
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
        this._turnStartTime = Date.now();
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
    const regionsContainer = container.querySelector('#regions-container') as HTMLElement;
    const factionsContainer = container.querySelector('#factions-container') as HTMLElement;

    if (lblTurn) lblTurn.textContent = this._currentSnapshot.turnNumber.toString();
    if (lblHash) lblHash.textContent = `${computeStateHash(this._currentSnapshot).substring(0, 16)}...`;
    if (regionsContainer) regionsContainer.innerHTML = this.renderRegionsHTML();
    if (factionsContainer) factionsContainer.innerHTML = this.renderFactionsHTML();
  }
}
