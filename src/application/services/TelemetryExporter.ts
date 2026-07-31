import { GSTTurnExecutionResult } from '../../domain/services/TurnEngine';
import { TrustState } from '../../domain/services/TrustComponent';

export interface TurnTelemetryRecord {
  session_seed: string;
  turn_number: number;
  allocation_before: {
    stateAdministration: number;
    investors: number;
    securityEstablishment: number;
    localCommunities: number;
    media: number;
  };
  allocation_after: {
    stateAdministration: number;
    investors: number;
    securityEstablishment: number;
    localCommunities: number;
    media: number;
  };
  allocation_delta: {
    source: string;
    target: string;
    amount: number;
  };
  trust_states_before: Array<{ actor: string; state: TrustState }>;
  trust_states_after: Array<{ actor: string; state: TrustState }>;
  rule_mutation_triggered: boolean;
  world_changes: Array<{ turn: number; edgeChanged: [string, string]; previousWeight: number; newWeight: number }>;
  consequences: Array<{ turn: number; actor: string; eventId: string }>;
  time_to_decision: number;
}

export class TelemetryExporter {
  private readonly _vectorOrder: string[];

  constructor(vectorOrder?: string[]) {
    this._vectorOrder = vectorOrder || [
      "StateAdministration",
      "Investors",
      "SecurityEstablishment",
      "LocalCommunities",
      "Media"
    ];
  }

  public exportRecord(
    sessionSeed: string,
    result: GSTTurnExecutionResult,
    moveInput: { sourceIndex: number; targetIndex: number; amount: number },
    timeToDecisionMs: number = 5000
  ): TurnTelemetryRecord {
    const toAllocObj = (arr: number[]): TurnTelemetryRecord['allocation_before'] => ({
      stateAdministration: arr[0],
      investors: arr[1],
      securityEstablishment: arr[2],
      localCommunities: arr[3],
      media: arr[4]
    });

    const toTrustSnapshots = (states: TrustState[]): Array<{ actor: string; state: TrustState }> =>
      this._vectorOrder.map((name, idx) => ({
        actor: name,
        state: states[idx]
      }));

    return {
      session_seed: sessionSeed,
      turn_number: result.turnNumber,
      allocation_before: toAllocObj(result.allocationBefore),
      allocation_after: toAllocObj(result.allocationAfter),
      allocation_delta: {
        source: this._vectorOrder[moveInput.sourceIndex],
        target: this._vectorOrder[moveInput.targetIndex],
        amount: moveInput.amount
      },
      trust_states_before: toTrustSnapshots(result.trustStatesBefore),
      trust_states_after: toTrustSnapshots(result.trustStatesAfter),
      rule_mutation_triggered: result.worldChanges.length > 0,
      world_changes: result.worldChanges.map(wc => ({
        turn: wc.turn,
        edgeChanged: [this._vectorOrder[wc.edgeChanged[0]], this._vectorOrder[wc.edgeChanged[1]]],
        previousWeight: wc.previousWeight,
        newWeight: wc.newWeight
      })),
      consequences: result.consequences.map(c => ({
        turn: c.turn,
        actor: this._vectorOrder[c.actorIndex],
        eventId: c.eventId
      })),
      time_to_decision: timeToDecisionMs
    };
  }
}
