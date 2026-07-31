import { IPersistencePort } from '../../application/ports/IPersistencePort';
import { SnapshotEnvelopeDTO } from '../../application/dtos/Snapshots';
import { MemoryStorageAdapter } from './MemoryStorageAdapter';

export class IndexedDBStorageAdapter implements IPersistencePort {
  private static DB_NAME = "ShadowStateDB";
  private static STORE_NAME = "snapshots";
  private static SAVE_KEY = "active_save";

  private _memoryFallback: MemoryStorageAdapter | null = null;

  private isIndexedDBAvailable(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
  }

  private async getDB(): Promise<IDBDatabase> {
    return new Promise<IDBDatabase>((resolve, reject) => {
      if (!this.isIndexedDBAvailable()) {
        reject(new Error("IndexedDB unavailable"));
        return;
      }

      const request = window.indexedDB.open(IndexedDBStorageAdapter.DB_NAME, 1);

      request.onupgradeneeded = (): void => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IndexedDBStorageAdapter.STORE_NAME)) {
          db.createObjectStore(IndexedDBStorageAdapter.STORE_NAME);
        }
      };

      request.onsuccess = (): void => resolve(request.result);
      request.onerror = (): void => reject(request.error);
    });
  }

  public async saveSnapshot(envelope: SnapshotEnvelopeDTO): Promise<boolean> {
    if (!this.isIndexedDBAvailable()) {
      if (!this._memoryFallback) this._memoryFallback = new MemoryStorageAdapter();
      return this._memoryFallback.saveSnapshot(envelope);
    }

    try {
      const db = await this.getDB();
      return new Promise<boolean>((resolve, reject) => {
        const tx = db.transaction([IndexedDBStorageAdapter.STORE_NAME], "readwrite", { durability: "relaxed" });
        const store = tx.objectStore(IndexedDBStorageAdapter.STORE_NAME);
        const putRequest = store.put(envelope, IndexedDBStorageAdapter.SAVE_KEY);

        tx.oncomplete = (): void => resolve(true);
        tx.onerror = (): void => reject(tx.error);
        putRequest.onerror = (): void => reject(putRequest.error);
      });
    } catch {
      if (!this._memoryFallback) this._memoryFallback = new MemoryStorageAdapter();
      return this._memoryFallback.saveSnapshot(envelope);
    }
  }

  public async loadActiveSnapshot(): Promise<SnapshotEnvelopeDTO | null> {
    if (!this.isIndexedDBAvailable()) {
      if (!this._memoryFallback) this._memoryFallback = new MemoryStorageAdapter();
      return this._memoryFallback.loadActiveSnapshot();
    }

    try {
      const db = await this.getDB();
      return new Promise<SnapshotEnvelopeDTO | null>((resolve, reject) => {
        const tx = db.transaction([IndexedDBStorageAdapter.STORE_NAME], "readonly");
        const store = tx.objectStore(IndexedDBStorageAdapter.STORE_NAME);
        const getRequest = store.get(IndexedDBStorageAdapter.SAVE_KEY);

        getRequest.onsuccess = (): void => {
          resolve(getRequest.result || null);
        };
        getRequest.onerror = (): void => reject(getRequest.error);
        tx.onerror = (): void => reject(tx.error);
      });
    } catch {
      if (!this._memoryFallback) this._memoryFallback = new MemoryStorageAdapter();
      return this._memoryFallback.loadActiveSnapshot();
    }
  }

  public async clearSnapshot(): Promise<void> {
    if (!this.isIndexedDBAvailable()) {
      if (this._memoryFallback) await this._memoryFallback.clearSnapshot();
      return;
    }

    try {
      const db = await this.getDB();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction([IndexedDBStorageAdapter.STORE_NAME], "readwrite", { durability: "relaxed" });
        const store = tx.objectStore(IndexedDBStorageAdapter.STORE_NAME);
        const deleteRequest = store.delete(IndexedDBStorageAdapter.SAVE_KEY);

        tx.oncomplete = (): void => resolve();
        tx.onerror = (): void => reject(tx.error);
        deleteRequest.onerror = (): void => reject(deleteRequest.error);
      });
    } catch {
      if (this._memoryFallback) await this._memoryFallback.clearSnapshot();
    }
  }
}
