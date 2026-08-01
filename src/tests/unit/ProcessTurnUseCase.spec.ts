import { describe, it, expect } from 'vitest';
import { ProcessTurnUseCase, ProcessTurnInput } from '../../application/usecases/ProcessTurnUseCase';
import { StartGameUseCase } from '../../application/usecases/StartGameUseCase';

describe('ProcessTurnUseCase BUGFIX-001 Fail-Fast Input Validation', () => {
  const EXPECTED_ERROR_MSG = "Invalid ProcessTurnInput: expected GSTAllocationMoveInput with finite numeric sourceIndex and targetIndex. Legacy action-based payloads are not supported by the GST runtime.";

  it('TEST 1: Invalid payload (missing sourceIndex / targetIndex) throws contract Error', () => {
    const useCase = new ProcessTurnUseCase();
    const initialSnapshot = new StartGameUseCase().execute();

    const invalidInput = { amount: 5 } as ProcessTurnInput;

    expect(() => useCase.execute(initialSnapshot, invalidInput)).toThrowError(EXPECTED_ERROR_MSG);
  });

  it('TEST 2: Legacy action-based payload ({ actionType, targetRegionId }) throws contract Error', () => {
    const useCase = new ProcessTurnUseCase();
    const initialSnapshot = new StartGameUseCase().execute();

    const legacyInput = {
      actionType: "DEVELOP",
      targetRegionId: "EL_ALAMEIN"
    } as ProcessTurnInput;

    expect(() => useCase.execute(initialSnapshot, legacyInput)).toThrowError(EXPECTED_ERROR_MSG);
  });

  it('TEST 3: Non-finite (NaN / Infinity) sourceIndex throws contract Error', () => {
    const useCase = new ProcessTurnUseCase();
    const initialSnapshot = new StartGameUseCase().execute();

    const nanInput = { sourceIndex: NaN, targetIndex: 0, amount: 5 } as ProcessTurnInput;
    expect(() => useCase.execute(initialSnapshot, nanInput)).toThrowError(EXPECTED_ERROR_MSG);

    const infinityInput = { sourceIndex: Infinity, targetIndex: 0, amount: 5 } as ProcessTurnInput;
    expect(() => useCase.execute(initialSnapshot, infinityInput)).toThrowError(EXPECTED_ERROR_MSG);
  });

  it('TEST 4: Valid GST payload executes normally without regression', () => {
    const useCase = new ProcessTurnUseCase();
    const initialSnapshot = new StartGameUseCase().execute();

    const validGstInput = { sourceIndex: 4, targetIndex: 0, amount: 5 };
    const res = useCase.execute(initialSnapshot, validGstInput);

    expect(res.snapshot.turnNumber).toBe(2);
    expect(res.snapshot.allocation.media).toBe(15);
    expect(res.snapshot.allocation.stateAdministration).toBe(25);
    expect(res.stateHash).toBeDefined();
    expect(typeof res.stateHash).toBe('string');
  });
});
