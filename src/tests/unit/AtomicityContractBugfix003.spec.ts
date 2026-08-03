import { describe, it, expect, vi } from 'vitest';
import { GSTTurnEngine } from '../../domain/services/TurnEngine';
import { TrustComponent, TrustState } from '../../domain/services/TrustComponent';
import { DatasetLoader } from '../../infrastructure/config/DatasetLoader';
import { ProcessTurnUseCase, ProcessTurnInput } from '../../application/usecases/ProcessTurnUseCase';
import { StartGameUseCase } from '../../application/usecases/StartGameUseCase';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('BUGFIX-003 Atomicity Contract & Acceptance Criteria Verification', () => {

  it('AC-1 — Negative Amount Rejected', () => {
    const useCase = new ProcessTurnUseCase();
    const snapshot = new StartGameUseCase().execute();

    const negativeInput = { sourceIndex: 4, targetIndex: 0, amount: -5 } as ProcessTurnInput;

    expect(() => useCase.execute(snapshot, negativeInput)).toThrowError(
      "Invalid ProcessTurnInput: expected GSTAllocationMoveInput with finite numeric sourceIndex and targetIndex. Legacy action-based payloads are not supported by the GST runtime."
    );
  });

  it('AC-2 — Reference Identity Preserved After Exception', () => {
    const loader = new DatasetLoader();
    const engine = new GSTTurnEngine(loader.loadBalanceConfig(), loader.loadInfluenceMatrix());

    const allocRefBefore = engine.allocationVector;
    const trustComponentsBefore = engine.trustComponents;

    expect(() => engine.executeTurn({ sourceIndex: 4, targetIndex: 0, amount: 1000 })).toThrow();

    const allocRefAfter = engine.allocationVector;
    const trustComponentsAfter = engine.trustComponents;

    // Value equality
    expect(allocRefAfter).toEqual(allocRefBefore);

    // Reference identity verification on trust components array elements
    expect(Object.is(trustComponentsBefore[0], trustComponentsAfter[0])).toBe(true);
    expect(Object.is(trustComponentsBefore[1], trustComponentsAfter[1])).toBe(true);
    expect(Object.is(trustComponentsBefore[2], trustComponentsAfter[2])).toBe(true);
    expect(Object.is(trustComponentsBefore[3], trustComponentsAfter[3])).toBe(true);
    expect(Object.is(trustComponentsBefore[4], trustComponentsAfter[4])).toBe(true);
  });

  it('AC-3 — Forced Exception After Preview (Step6/Step7 Mock Failure)', () => {
    const loader = new DatasetLoader();
    const engine = new GSTTurnEngine(loader.loadBalanceConfig(), loader.loadInfluenceMatrix());

    const initialScores = engine.internalScores;
    const initialStates = engine.trustStates;

    // Inject failure inside Step 6 mutation scheduler
    vi.spyOn(engine.mutationScheduler, 'previewStep6').mockImplementationOnce(() => {
      throw new Error('Simulated evaluateStep6 Failure');
    });

    expect(() => engine.executeTurn({ sourceIndex: 4, targetIndex: 0, amount: 5 })).toThrow('Simulated evaluateStep6 Failure');

    // Assert TrustComponent internal state is unchanged
    expect(engine.internalScores).toEqual(initialScores);
    expect(engine.trustStates).toEqual(initialStates);
  });

  it('AC-3a — Preview/Commit Equivalence across live threshold matrix (CTR-E)', () => {
    const loader = new DatasetLoader();
    const balanceConfig = loader.loadBalanceConfig();
    const thresholds = balanceConfig.hysteresisThresholds;

    const startingStates: TrustState[] = [TrustState.Healthy, TrustState.Unstable, TrustState.Hostile];
    const thresholdValues = Object.values(thresholds);

    const testDeltas: number[] = [
      0, // zero
      5, // positive non-crossing
      -5, // negative non-crossing
      -100, // clamp lower
      100 // clamp upper
    ];

    // Add ON threshold, ε below (0.01 below), and ε above (0.01 above) for each live threshold
    for (const val of thresholdValues) {
      testDeltas.push(val);
      testDeltas.push(val - 0.01);
      testDeltas.push(val + 0.01);
    }

    for (const startState of startingStates) {
      for (const delta of testDeltas) {
        // Create initial TrustComponent with initial score matching startState
        let startScore = 50;
        if (startState === TrustState.Hostile) startScore = 10;
        if (startState === TrustState.Unstable) startScore = 35;
        if (startState === TrustState.Healthy) startScore = 80;

        const tcPreview = new TrustComponent(startScore, thresholds);
        const tcCommit = new TrustComponent(startScore, thresholds);

        const previewState = tcPreview.previewUpdate(delta);
        const committedState = tcCommit.updateScore(delta);

        expect(previewState, `Equivalence mismatch for startState ${startState} & delta ${delta}`).toBe(committedState);
      }
    }
  });

  it('AC-3b — Structural Single-Source Verification (D-3)', () => {
    const filePath = join(process.cwd(), 'src', 'domain', 'services', 'TrustComponent.ts');
    const content = readFileSync(filePath, 'utf-8');

    // Verify computeTransition helper exists
    expect(content.includes('computeTransition(delta: number)')).toBe(true);

    // Verify previewUpdate delegates to computeTransition
    expect(content.includes('previewUpdate(delta: number): TrustState {\n    return this.computeTransition(delta).state;')).toBe(true);

    // Verify updateScore delegates to computeTransition
    expect(content.includes('const { score, state } = this.computeTransition(delta);')).toBe(true);
  });

  it('AC-4 — Forced Exception After Step6, Before Step7', () => {
    const loader = new DatasetLoader();
    const engine = new GSTTurnEngine(loader.loadBalanceConfig(), loader.loadInfluenceMatrix());

    const allocBefore = engine.allocationVector;

    // Inject failure inside Step 7 neglect tracker
    vi.spyOn(engine.neglectTracker, 'evaluateStep7').mockImplementationOnce(() => {
      throw new Error('Simulated evaluateStep7 Failure');
    });

    expect(() => engine.executeTurn({ sourceIndex: 4, targetIndex: 0, amount: 5 })).toThrow('Simulated evaluateStep7 Failure');

    // Assert allocationVector unchanged
    expect(engine.allocationVector).toEqual(allocBefore);
  });

  it('AC-4a — Forced Exception After Step 6 Preview, Before Commit Barrier (D-4 & Revision v1.1)', () => {
    const loader = new DatasetLoader();
    const engine = new GSTTurnEngine(loader.loadBalanceConfig(), loader.loadInfluenceMatrix());

    // Advance engine to Turn 11
    for (let turn = 1; turn <= 10; turn++) {
      engine.executeTurn({ sourceIndex: (turn - 1) % 5, targetIndex: turn % 5, amount: 5 });
    }

    expect(engine.turnNumber).toBe(11);
    expect(engine.mutationScheduler.hasTriggered).toBe(false);

    const weightBefore = engine.influenceMatrix.getEdgeWeight(0, 1);
    const turnBefore = engine.turnNumber;
    const allocBefore = engine.allocationVector;
    const scoresBefore = engine.internalScores;
    const statesBefore = engine.trustStates;

    // Inject failure inside Step 7 neglect tracker
    vi.spyOn(engine.neglectTracker, 'evaluateStep7').mockImplementationOnce(() => {
      throw new Error('Simulated evaluateStep7 Failure on Turn 11');
    });

    expect(() => engine.executeTurn({ sourceIndex: 0, targetIndex: 1, amount: 5 })).toThrow('Simulated evaluateStep7 Failure on Turn 11');

    // Assert Step 6 world change state remains UNCHANGED (uncommitted)
    expect(engine.mutationScheduler.hasTriggered).toBe(false);
    expect(engine.influenceMatrix.getEdgeWeight(0, 1)).toBe(weightBefore);

    // Assert entire engine state remains UNCHANGED
    expect(engine.turnNumber).toBe(turnBefore);
    expect(engine.allocationVector).toEqual(allocBefore);
    expect(engine.internalScores).toEqual(scoresBefore);
    expect(engine.trustStates).toEqual(statesBefore);
  });

  it('Turn 11 Success Path — Preview/Commit Execution (D-4)', () => {
    const loader = new DatasetLoader();
    const engine = new GSTTurnEngine(loader.loadBalanceConfig(), loader.loadInfluenceMatrix());

    // Advance engine to Turn 11
    for (let turn = 1; turn <= 10; turn++) {
      engine.executeTurn({ sourceIndex: (turn - 1) % 5, targetIndex: turn % 5, amount: 5 });
    }

    expect(engine.turnNumber).toBe(11);
    expect(engine.mutationScheduler.hasTriggered).toBe(false);

    const weightBefore = engine.influenceMatrix.getEdgeWeight(0, 1);

    // Clean execution of Turn 11
    const res = engine.executeTurn({ sourceIndex: 0, targetIndex: 1, amount: 5 });

    // Assert exactly 1 world change record returned
    expect(res.worldChanges.length).toBe(1);
    expect(res.worldChanges[0].turn).toBe(11);
    expect(res.worldChanges[0].edgeChanged).toEqual([0, 1]);
    expect(res.worldChanges[0].previousWeight).toBe(weightBefore);

    // Assert state committed post-barrier
    expect(engine.mutationScheduler.hasTriggered).toBe(true);
    expect(engine.influenceMatrix.getEdgeWeight(0, 1)).toBe(res.worldChanges[0].newWeight);
  });

  it('AC-5 — Forced Exception Immediately Before Commit', () => {
    const loader = new DatasetLoader();
    const engine = new GSTTurnEngine(loader.loadBalanceConfig(), loader.loadInfluenceMatrix());

    const turnBefore = engine.turnNumber;
    const allocBefore = engine.allocationVector;
    const scoresBefore = engine.internalScores;
    const statesBefore = engine.trustStates;

    // Inject failure inside evaluateStep7 immediately prior to Commit Barrier
    vi.spyOn(engine.neglectTracker, 'evaluateStep7').mockImplementationOnce(() => {
      throw new Error('Immediate Pre-Commit Barrier Exception');
    });

    expect(() => engine.executeTurn({ sourceIndex: 4, targetIndex: 0, amount: 5 })).toThrow('Immediate Pre-Commit Barrier Exception');

    // Assert entire engine state unchanged
    expect(engine.turnNumber).toBe(turnBefore);
    expect(engine.allocationVector).toEqual(allocBefore);
    expect(engine.internalScores).toEqual(scoresBefore);
    expect(engine.trustStates).toEqual(statesBefore);
  });
});
