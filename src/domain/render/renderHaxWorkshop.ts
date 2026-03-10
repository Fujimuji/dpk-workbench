import { buildHaxWireData } from '@/domain/import/hax/documentModel';
import { normalizeHaxEffect } from '@/domain/import/hax/effectRules';
import type { HaxDocument, HaxEffect, Vec3Payload } from '@/domain/import/hax/types';
import { requireCompleteDraftVec3 } from '@/domain/model/draftVectors';
import { formatNumber, renderVector } from '@/domain/render/sections';

const HAX_VARIABLE_BLOCK = `variables
{
\tglobal:
\t\t0: CPposition
\t\t1: Radius_VA_GoBackCP
\t\t2: Connections
\t\t3: Mission
\t\t4: Prime
\t\t5: AbilityCount
\t\t6: HiddenCP_TpRad_TT
\t\t7: TP
\t\t8: Effect
\t\t9: FakeUpperCP
}`;

function renderBoolean(value: boolean): string {
  return value ? 'True' : 'False';
}

function renderNullableNumber(value: number | null): string {
  return value === null ? 'True' : formatNumber(value);
}

function renderLooseValue(value: false | true | number | number[] | HaxEffect[] | { x: number; y: number; z: number }): string {
  if (typeof value === 'boolean') {
    return renderBoolean(value);
  }

  if (typeof value === 'number') {
    return formatNumber(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'False';
    }

    if (typeof value[0] === 'number') {
      return `Array(${(value as number[]).map((entry) => formatNumber(entry)).join(', ')})`;
    }

    return `Array(${(value as HaxEffect[]).map(renderEffect).join(', ')})`;
  }

  return renderVector(value);
}

function renderEffectPayload(payload: number | Vec3Payload): string {
  if (typeof payload === 'number') {
    return formatNumber(payload);
  }

  return `Array(${renderVector(payload.direction)}, ${formatNumber(payload.power)})`;
}

function renderEffect(effect: HaxEffect): string {
  const normalized = normalizeHaxEffect(effect);
  return `Array(${renderVector(requireCompleteDraftVec3(normalized.position, 'Hax effect position'))}, ${formatNumber(normalized.radius)}, ${normalized.type}, ${renderEffectPayload(normalized.payload)})`;
}

function renderSlotArray(values: string[]): string {
  return `Array(${values.join(', ')})`;
}

export function renderHaxWorkshop(document: HaxDocument): string {
  const wire = buildHaxWireData(document);
  const lines: string[] = [HAX_VARIABLE_BLOCK, '', 'actions', '{'];

  lines.push(`\tGlobal.CPposition = ${renderSlotArray(wire.checkpointPositions.map(renderVector))};`);
  lines.push(`\tGlobal.Radius_VA_GoBackCP = ${renderSlotArray(wire.radiusViewAngleGoBack.map(renderVector))};`);
  lines.push(
    `\tGlobal.Connections = ${renderSlotArray(
      wire.connections.map((connection) => (connection === false ? 'False' : formatNumber(connection)))
    )};`
  );
  lines.push(`\tGlobal.Mission = ${renderSlotArray(wire.missions.map(renderLooseValue))};`);
  lines.push(
    `\tGlobal.Prime = ${renderSlotArray(wire.checkpointPrimes.map((prime) => renderNullableNumber(prime)))};`
  );
  lines.push(`\tGlobal.AbilityCount = ${renderSlotArray(wire.abilityCounts.map(renderLooseValue))};`);
  lines.push(
    `\tGlobal.HiddenCP_TpRad_TT = ${renderSlotArray(wire.hiddenTeleportTimeTrial.map(renderLooseValue))};`
  );
  lines.push(`\tGlobal.TP = ${renderSlotArray(wire.teleports.map(renderLooseValue))};`);
  lines.push(`\tGlobal.Effect = ${renderSlotArray(wire.checkpointEffects.map(renderLooseValue))};`);
  lines.push(
    `\tGlobal.FakeUpperCP = ${renderSlotArray(wire.fakeUpperCheckpointStates.map(renderBoolean))};`
  );
  lines.push('}');

  return lines.join('\n');
}
