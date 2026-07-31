import { createHash } from 'crypto';
import { GameStateSnapshotDTO } from '../dtos/Snapshots';

export function canonicalizeDeep(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    if (typeof obj === 'bigint') {
      return `${obj.toString()}n`;
    }
    return obj;
  }
  if (obj instanceof Map) {
    const sortedKeys = Array.from(obj.keys()).sort();
    const result: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      result[key] = canonicalizeDeep(obj.get(key));
    }
    return result;
  }
  if (Array.isArray(obj)) {
    return obj.map(canonicalizeDeep);
  }
  const sortedKeys = Object.keys(obj).sort();
  const result: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    result[key] = canonicalizeDeep((obj as Record<string, unknown>)[key]);
  }
  return result;
}

export function computeStateHash(snapshot: GameStateSnapshotDTO): string {
  const canonicalSnapshot = canonicalizeDeep(snapshot);
  const canonicalJson = JSON.stringify(canonicalSnapshot);
  return createHash('sha256').update(canonicalJson).digest('hex');
}
