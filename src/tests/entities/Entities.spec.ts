import { describe, it, expect } from 'vitest';
import { Region } from '../../domain/entities/Region';
import { TurnAction, ValidActionType } from '../../domain/entities/TurnAction';
import { RegionId } from '../../domain/values/RegionId';
import { FactionId } from '../../domain/values/FactionId';
import { TurnNumber } from '../../domain/values/TurnNumber';

describe('Domain Entities Unit Tests', () => {
  const regionId = new RegionId('EL_ALAMEIN');
  const factionId = new FactionId('FACTION_ALPHA');

  describe('Region Entity', () => {
    it('instantiates valid Region and enforces immutability', () => {
      const region = new Region(regionId, 'El Alamein', factionId, 3, 5);
      expect(region.id.value).toBe('EL_ALAMEIN');
      expect(region.name).toBe('El Alamein');
      expect(region.controllerFactionId.value).toBe('FACTION_ALPHA');
      expect(region.infrastructureLevel).toBe(3);
      expect(region.defenseLevel).toBe(5);

      const updated = region.withInfrastructureLevel(4);
      expect(updated.infrastructureLevel).toBe(4);
      expect(region.infrastructureLevel).toBe(3); // Original remains unchanged
    });

    it('rejects invalid Region construction parameters', () => {
      expect(() => new Region(regionId, '', factionId, 1, 1)).toThrow(/empty/);
      expect(() => new Region(regionId, 'Test', factionId, 0, 5)).toThrow(/infrastructureLevel/);
      expect(() => new Region(regionId, 'Test', factionId, 11, 5)).toThrow(/infrastructureLevel/);
      expect(() => new Region(regionId, 'Test', factionId, 5, 0)).toThrow(/defenseLevel/);
      expect(() => new Region(regionId, 'Test', factionId, 5, 12)).toThrow(/defenseLevel/);
    });
  });

  describe('TurnAction Entity', () => {
    it('instantiates valid TurnAction entity', () => {
      const turnNumber = new TurnNumber(1);
      const action = new TurnAction('act-001', factionId, regionId, 'DEVELOP', turnNumber);

      expect(action.id).toBe('act-001');
      expect(action.factionId.value).toBe('FACTION_ALPHA');
      expect(action.targetRegionId.value).toBe('EL_ALAMEIN');
      expect(action.actionType).toBe('DEVELOP');
      expect(action.turnNumber.value).toBe(1);
    });

    it('rejects invalid TurnAction parameters', () => {
      const turnNumber = new TurnNumber(1);
      expect(() => new TurnAction('', factionId, regionId, 'DEVELOP', turnNumber)).toThrow(/empty/);
      expect(() => new TurnAction('act-001', factionId, regionId, 'INVALID_ACTION' as unknown as ValidActionType, turnNumber)).toThrow(/actionType/);
    });
  });
});
