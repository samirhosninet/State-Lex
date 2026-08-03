/**
 * Shadow State — Model A Certification
 * Rebuilt from first principles using ONLY engine semantics.
 *
 * Source of truth:
 *   InfluenceMatrix.ts L26-29: source iterates 0..4 unconditionally
 *   TurnEngine.ts L130-131: allocation transfer, any actor valid
 *   DeterministicMath.ts L7: round to 2 decimal places post-summation
 *
 * Model A rules:
 *   - Allocation is ALWAYS across all 5 actors
 *   - Sacrifice(S) changes ONLY which actors appear in the min objective
 *   - Balanced metric = optimal maximin over ALL 5 actors (NOT fixed 20/20/20/20/20)
 */

const M0: number[][] = [
  [ 0.0,  0.2,  0.3, -0.2,  0.1],   // SA  (source 0)
  [-0.1,  0.0,  0.2, -0.3, -0.2],   // INV (source 1)
  [ 0.2,  0.2,  0.0, -0.4, -0.3],   // SEC (source 2)
  [ 0.1, -0.2, -0.3,  0.0,  0.3],   // LC  (source 3)
  [-0.3, -0.2, -0.2,  0.4,  0.0],   // MED (source 4)
];
const ACTORS = ['SA','INV','SEC','LC','MED'];
const N = 5;

// ===== LINEAR ALGEBRA =====
function gaussElim(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  const aug = A.map((r, i) => [...r, b[i]]);
  for (let col = 0; col < n; col++) {
    let mx = 0, mr = -1;
    for (let r = col; r < n; r++) {
      if (Math.abs(aug[r][col]) > mx) { mx = Math.abs(aug[r][col]); mr = r; }
    }
    if (mx < 1e-12) return null;
    [aug[col], aug[mr]] = [aug[mr], aug[col]];
    for (let r = col + 1; r < n; r++) {
      const f = aug[r][col] / aug[col][col];
      for (let j = col; j <= n; j++) aug[r][j] -= f * aug[col][j];
    }
  }
  const x = new Array(n);
  for (let r = n - 1; r >= 0; r--) {
    let s = aug[r][n];
    for (let j = r + 1; j < n; j++) s -= aug[r][j] * x[j];
    x[r] = s / aug[r][r];
  }
  return x;
}

function getSubsets(arr: number[], k: number): number[][] {
  if (k === 0) return [[]];
  if (k > arr.length) return [];
  const res: number[][] = [];
  for (let i = 0; i <= arr.length - k; i++)
    for (const rest of getSubsets(arr.slice(i + 1), k - 1))
      res.push([arr[i], ...rest]);
  return res;
}

// ===== GAME VALUE: m×n MATRIX (Support Enumeration) =====
function gameValueMxN(P: number[][]): number {
  const m = P.length;
  const n = P[0].length;
  if (m === 0 || n === 0) return 0;

  const rowIdx = Array.from({ length: m }, (_, i) => i);
  const colIdx = Array.from({ length: n }, (_, i) => i);
  let best = -Infinity;

  for (let j = 0; j < m; j++) {
    const v = Math.min(...P[j]);
    if (v > best) best = v;
  }

  const maxS = Math.min(m, n);
  for (let s = 2; s <= maxS; s++) {
    const rowSubs = getSubsets(rowIdx, s);
    const colSubs = getSubsets(colIdx, s);
    for (const SR of rowSubs) {
      for (const SC of colSubs) {
        const dim = s + 1;
        const A: number[][] = [];
        const b: number[] = [];
        for (let ci = 0; ci < s; ci++) {
          const row = new Array(dim).fill(0);
          for (let ri = 0; ri < s; ri++) row[ri] = P[SR[ri]][SC[ci]];
          row[s] = -1;
          A.push(row);
          b.push(0);
        }
        const sumRow = new Array(dim).fill(0);
        for (let ri = 0; ri < s; ri++) sumRow[ri] = 1;
        A.push(sumRow);
        b.push(1);

        const x = gaussElim(A, b);
        if (!x) continue;
        const p = x.slice(0, s);
        const V = x[s];
        if (p.some(v => v < -1e-9)) continue;

        let ok = true;
        for (const i of colIdx) {
          if (SC.includes(i)) continue;
          let val = 0;
          for (let ri = 0; ri < s; ri++) val += p[ri] * P[SR[ri]][i];
          if (val < V - 1e-9) { ok = false; break; }
        }
        if (!ok) continue;
        if (V > best + 1e-12) best = V;
      }
    }
  }
  return best;
}

function buildPayoffMatrix(M: number[][], kept: number[]): number[][] {
  const P: number[][] = [];
  for (let j = 0; j < N; j++) {
    P.push(kept.map(i => M[j][i]));
  }
  return P;
}

export function sacrificeAdvA(M: number[][], sacrificed: number[]): number {
  const kept = [0,1,2,3,4].filter(i => !sacrificed.includes(i));
  return 100 * gameValueMxN(buildPayoffMatrix(M, kept));
}

export function balancedMetricA(M: number[][]): number {
  return 100 * gameValueMxN(buildPayoffMatrix(M, [0,1,2,3,4]));
}

const ALL_SCENARIOS: number[][] = [
  ...getSubsets([0,1,2,3,4], 1),
  ...getSubsets([0,1,2,3,4], 2),
  ...getSubsets([0,1,2,3,4], 3),
];

export function maxGapA(M: number[][]): { gap: number, worst: number[], bal: number, worstAdv: number } {
  const bal = balancedMetricA(M);
  let maxG = -Infinity;
  let worst: number[] = [];
  let worstAdv = 0;
  for (const S of ALL_SCENARIOS) {
    const adv = sacrificeAdvA(M, S);
    const g = adv - bal;
    if (g > maxG) { maxG = g; worst = S; worstAdv = adv; }
  }
  return { gap: maxG, worst, bal, worstAdv };
}

if (require.main === module) {
  console.log('Model A Certification Script Loaded');
  const balA = balancedMetricA(M0);
  console.log(`Balanced metric: ${balA.toFixed(4)}`);
}
