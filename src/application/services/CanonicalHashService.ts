import { GameStateSnapshotDTO } from '../dtos/Snapshots';

// Pure JS SHA-256 implementation for 100% platform-independent, zero-dependency hashing across Node and Browsers
function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let i: number, j: number;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  const h: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, number> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 300; i += candidate) {
        isComposite[i] = candidate;
      }
      h[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  let formattedAscii = ascii + '\x80';
  while ((formattedAscii.length % 64) - 56) formattedAscii += '\x00';
  for (i = 0; i < formattedAscii.length; i++) {
    j = formattedAscii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength | 0;

  let currentHash = [...h];

  for (j = 0; j < words.length;) {
    const w = words.slice(j, (j += 16));
    const oldHash = currentHash;
    currentHash = currentHash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const a = currentHash[0], e = currentHash[4];
      const temp1 =
        currentHash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & currentHash[5]) ^ (~e & currentHash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);

      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & currentHash[1]) ^ (a & currentHash[2]) ^ (currentHash[1] & currentHash[2]));

      currentHash = [(temp1 + temp2) | 0].concat(currentHash);
      currentHash[4] = (currentHash[4] + temp1) | 0;
    }

    for (i = 0; i < 8; i++) {
      currentHash[i] = (currentHash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (currentHash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

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
  return sha256(canonicalJson);
}
