import { GameState } from '../../domain/aggregates/GameState';
import { TurnAction } from '../../domain/entities/TurnAction';
import { FactionId } from '../../domain/values/FactionId';


export class DeterministicRuleAI {
  public static selectAction(state: GameState, factionId: FactionId): TurnAction | null {
    const faction = state.factions.get(factionId.value);
    if (!faction) return null;

    // AI rule: If resources >= 50 units (5000n base units), alternate DEVELOP / FORTIFY on controlled region
    if (faction.resources.baseUnits >= 5000n && faction.controlledRegionIds.length > 0) {
      const targetRegionId = faction.controlledRegionIds[0];
      const actionType = state.turnNumber.value % 2 === 0 ? "FORTIFY" : "DEVELOP";
      const actionId = `ai-act-${factionId.value}-${state.turnNumber.value}`;

      return new TurnAction(
        actionId,
        factionId,
        targetRegionId,
        actionType,
        state.turnNumber
      );
    }

    return null;
  }
}
