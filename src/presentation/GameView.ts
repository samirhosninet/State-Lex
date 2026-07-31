import { ValidActionType } from '../domain/entities/TurnAction';
import { ValidRegionId } from '../domain/values/RegionId';
import { StartGameUseCase } from '../application/usecases/StartGameUseCase';
import { ProcessTurnUseCase } from '../application/usecases/ProcessTurnUseCase';
import { SaveGameUseCase } from '../application/usecases/SaveGameUseCase';
import { LoadGameUseCase } from '../application/usecases/LoadGameUseCase';
import { IndexedDBStorageAdapter } from '../infrastructure/persistence/IndexedDBStorageAdapter';
import { GameStateSnapshotDTO } from '../application/dtos/Snapshots';
import { computeStateHash } from '../application/services/CanonicalHashService';

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
          <h1 style="margin: 0 0 0.5rem; color: #38bdf8; font-size: 1.75rem;">SHADOW STATE — Vertical Slice 0.1</h1>
          <div style="display: flex; gap: 2rem; font-size: 0.95rem; color: #94a3b8;">
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

          <!-- Player Controls -->
          <section style="background: rgba(30, 41, 59, 0.6); padding: 1.5rem; border-radius: 12px; border: 1px solid #334155; display: flex; flex-direction: column; gap: 1rem;">
            <h2 style="margin-top: 0; color: #f1f5f9; font-size: 1.25rem;">Command Selection</h2>
            
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <label for="sel-action" style="font-size: 0.9rem; color: #94a3b8;">Action Type:</label>
              <select id="sel-action" style="background: #0f172a; color: #f8fafc; border: 1px solid #475569; padding: 0.5rem; border-radius: 6px;">
                <option value="DEVELOP">DEVELOP (+1 Infrastructure)</option>
                <option value="FORTIFY">FORTIFY (+1 Defense)</option>
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

            <button id="btn-execute" style="background: #0284c7; color: #fff; border: none; padding: 0.75rem; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 0.5rem;">Execute Turn</button>

            <hr style="border-color: #334155; margin: 1rem 0; width: 100%;" />

            <h3 style="margin-top: 0; color: #cbd5e1; font-size: 1rem;">Persistence Pipeline</h3>
            <div style="display: flex; gap: 0.5rem;">
              <button id="btn-new" style="background: #475569; color: #fff; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; flex: 1;">New Game</button>
              <button id="btn-save" style="background: #16a34a; color: #fff; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; flex: 1;">Save</button>
              <button id="btn-load" style="background: #9333ea; color: #fff; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; flex: 1;">Load</button>
            </div>

            <div id="status-banner" style="background: #1e293b; padding: 0.75rem; border-radius: 6px; border: 1px solid #475569; font-size: 0.85rem; color: #38bdf8; min-height: 2.5rem;">
              Ready. Issue commands and execute turn.
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

    btnExecute?.addEventListener('click', () => {
      const selAction = container.querySelector('#sel-action') as HTMLSelectElement;
      const selRegion = container.querySelector('#sel-region') as HTMLSelectElement;

      const actionType = selAction.value as ValidActionType;
      const targetRegionId = selRegion.value as ValidRegionId;

      const turnResult = this._processTurnUseCase.execute(this._currentSnapshot, {
        actionType,
        targetRegionId
      });

      this._currentSnapshot = turnResult.snapshot;
      this.updateUI(container);
      statusBanner.textContent = `Turn ${this._currentSnapshot.turnNumber - 1} executed. Hash: ${turnResult.stateHash.substring(0, 16)}...`;
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
    const regionsContainer = container.querySelector('#regions-container') as HTMLElement;
    const factionsContainer = container.querySelector('#factions-container') as HTMLElement;

    if (lblTurn) lblTurn.textContent = this._currentSnapshot.turnNumber.toString();
    if (lblHash) lblHash.textContent = `${computeStateHash(this._currentSnapshot).substring(0, 16)}...`;
    if (regionsContainer) regionsContainer.innerHTML = this.renderRegionsHTML();
    if (factionsContainer) factionsContainer.innerHTML = this.renderFactionsHTML();
  }
}
