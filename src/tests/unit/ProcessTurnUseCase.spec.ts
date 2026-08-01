import { describe, it, expect } from 'vitest';
import { ProcessTurnUseCase, ProcessTurnInput } from '../../application/usecases/ProcessTurnUseCase';
import { StartGameUseCase } from '../../application/usecases/StartGameUseCase';
import { GSTTurnEngine } from '../../domain/services/TurnEngine';
import { DatasetLoader } from '../../infrastructure/config/DatasetLoader';

describe('ProcessTurnUseCase BUGFIX-002 & BUGFIX-003 Fail-Fast Validation & Exception Recovery', () => {
  const EXPECTED_ERROR_MSG = "Invalid ProcessTurnInput: expected GSTAllocationMoveInput with finite numeric sourceIndex and targetIndex. Legacy action-based payloads are not supported by the GST runtime.";

  it('1. Legacy payload ({ actionType, targetRegionId }) rejected', () => {
    const useCase = new ProcessTurnUseCase();
    const initialSnapshot = new StartGameUseCase().execute();

    const legacyInput = {
      actionType: "DEVELOP",
      targetRegionId: "EL_ALAMEIN"
    } as ProcessTurnInput;

    expect(() => useCase.execute(initialSnapshot, legacyInput)).toThrowError(EXPECTED_ERROR_MSG);
  });

  it('2. Missing sourceIndex rejected', () => {
    const useCase = new ProcessTurnUseCase();
    const initialSnapshot = new StartGameUseCase().execute();

    const invalidInput = { targetIndex: 0, amount: 5 } as ProcessTurnInput;
    expect(() => useCase.execute(initialSnapshot, invalidInput)).toThrowError(EXPECTED_ERROR_MSG);
  });

  it('3. Missing targetIndex rejected', () => {
    const useCase = new ProcessTurnUseCase();
    const initialSnapshot = new StartGameUseCase().execute();

    const invalidInput = { sourceIndex: 4, amount: 5 } as ProcessTurnInput;
    expect(() => useCase.execute(initialSnapshot, invalidInput)).toThrowError(EXPECTED_ERROR_MSG);
  });

  it('4. NaN sourceIndex rejected', () => {
    const useCase = new ProcessTurnUseCase();
    const initialSnapshot = new StartGameUseCase().execute();

    const nanInput = { sourceIndex: NaN, targetIndex: 0, amount: 5 } as ProcessTurnInput;
    expect(() => useCase.execute(initialSnapshot, nanInput)).toThrowError(EXPECTED_ERROR_MSG);
  });

  it('5. NaN targetIndex rejected', () => {
    const useCase = new ProcessTurnUseCase();
    const initialSnapshot = new StartGameUseCase().execute();

    const nanInput = { sourceIndex: 4, targetIndex: NaN, amount: 5 } as ProcessTurnInput;
    expect(() => useCase.execute(initialSnapshot, nanInput)).toThrowError(EXPECTED_ERROR_MSG);
  });

  it('6. Infinity sourceIndex rejected', () => {
    const useCase = new ProcessTurnUseCase();
    const initialSnapshot = new StartGameUseCase().execute();

    const infinityInput = { sourceIndex: Infinity, targetIndex: 0, amount: 5 } as ProcessTurnInput;
    expect(() => useCase.execute(initialSnapshot, infinityInput)).toThrowError(EXPECTED_ERROR_MSG);
  });

  it('7. Infinity targetIndex rejected', () => {
    const useCase = new ProcessTurnUseCase();
    const initialSnapshot = new StartGameUseCase().execute();

    const infinityInput = { sourceIndex: 4, targetIndex: Infinity, amount: 5 } as ProcessTurnInput;
    expect(() => useCase.execute(initialSnapshot, infinityInput)).toThrowError(EXPECTED_ERROR_MSG);
  });

  it('8. Fractional sourceIndex (2.5) rejected', () => {
    const useCase = new ProcessTurnUseCase();
    const initialSnapshot = new StartGameUseCase().execute();

    const fractionalInput = { sourceIndex: 2.5, targetIndex: 0, amount: 5 } as ProcessTurnInput;
    expect(() => useCase.execute(initialSnapshot, fractionalInput)).toThrowError(EXPECTED_ERROR_MSG);
  });

  it('9. Fractional targetIndex (2.5) rejected', () => {
    const useCase = new ProcessTurnUseCase();
    const initialSnapshot = new StartGameUseCase().execute();

    const fractionalInput = { sourceIndex: 4, targetIndex: 2.5, amount: 5 } as ProcessTurnInput;
    expect(() => useCase.execute(initialSnapshot, fractionalInput)).toThrowError(EXPECTED_ERROR_MSG);
  });

  it('10. NaN amount rejected', () => {
    const useCase = new ProcessTurnUseCase();
    const initialSnapshot = new StartGameUseCase().execute();

    const nanAmountInput = { sourceIndex: 4, targetIndex: 0, amount: NaN } as ProcessTurnInput;
    expect(() => useCase.execute(initialSnapshot, nanAmountInput)).toThrowError(EXPECTED_ERROR_MSG);
  });

  it('11. Infinity amount rejected', () => {
    const useCase = new ProcessTurnUseCase();
    const initialSnapshot = new StartGameUseCase().execute();

    const infinityAmountInput = { sourceIndex: 4, targetIndex: 0, amount: Infinity } as ProcessTurnInput;
    expect(() => useCase.execute(initialSnapshot, infinityAmountInput)).toThrowError(EXPECTED_ERROR_MSG);
  });

  it('12. Successful valid move executes normally', () => {
    const useCase = new ProcessTurnUseCase();
    const initialSnapshot = new StartGameUseCase().execute();

    const validGstInput = { sourceIndex: 4, targetIndex: 0, amount: 5 };
    const res = useCase.execute(initialSnapshot, validGstInput);

    expect(res.snapshot.turnNumber).toBe(2);
    expect(res.snapshot.allocation.media).toBe(15);
    expect(res.snapshot.allocation.stateAdministration).toBe(25);
    expect(res.stateHash).toBeDefined();
  });

  it('13. Exception Recovery: Engine state remains 100% unchanged after any thrown Error', () => {
    const loader = new DatasetLoader();
    const engine = new GSTTurnEngine(loader.loadBalanceConfig(), loader.loadInfluenceMatrix());

    const initialTurn = engine.turnNumber;
    const initialAlloc = engine.allocationVector;
    const initialScores = engine.internalScores;
    const initialStates = engine.trustStates;

    // Attempt invalid move directly on engine
    expect(() => engine.executeTurn({ sourceIndex: 2.5, targetIndex: 0, amount: 5 })).toThrow();
    expect(() => engine.executeTurn({ sourceIndex: 4, targetIndex: 0, amount: 1000 })).toThrow();
    expect(() => engine.executeTurn({ sourceIndex: NaN, targetIndex: 0, amount: 5 })).toThrow();

    // Verify engine state remains 100% unchanged
    expect(engine.turnNumber).toBe(initialTurn);
    expect(engine.allocationVector).toEqual(initialAlloc);
    expect(engine.internalScores).toEqual(initialScores);
    expect(engine.trustStates).toEqual(initialStates);
  });
});
