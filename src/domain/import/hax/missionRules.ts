import { ParseError } from '@/shared/errors/AppError';

export const HAX_LOCK_MISSION_VALUE = 9930;

export const HAX_MISSION_DEFINITIONS = [
  { id: 'noRocketPunch', label: 'No Rocket Punch', prime: 2 },
  { id: 'noUppercut', label: 'No Uppercut', prime: 3 },
  { id: 'noSeismicSlam', label: 'No Seismic Slam', prime: 5 },
  { id: 'stallless', label: 'Stallless', prime: 7 },
  { id: 'headbounce', label: 'Headbounce', prime: 11 },
  { id: 'spin360', label: '360 Spin', prime: 13 },
  { id: 'useRocketPunchFirst', label: 'Use Rocket Punch First', prime: 17 },
  { id: 'useUppercutFirst', label: 'Use Uppercut First', prime: 19 },
  { id: 'useSeismicSlamFirst', label: 'Use Seismic Slam First', prime: 23 },
  { id: 'diagonalRocketPunch', label: 'Diagonal Rocket Punch', prime: 29 },
  { id: 'downDiagonalRocketPunch', label: 'Down Diagonal Rocket Punch', prime: 31 },
  { id: 'rocketPunchBounce', label: 'Rocket Punch Bounce', prime: 37 }
] as const;

export const HAX_MISSION_PRIMES = Object.fromEntries(
  HAX_MISSION_DEFINITIONS.map((entry) => [entry.id, entry.prime])
) as Record<(typeof HAX_MISSION_DEFINITIONS)[number]['id'], number>;

export type HaxMissionId = keyof typeof HAX_MISSION_PRIMES;

export const HAX_MISSION_ORDER = HAX_MISSION_DEFINITIONS
  .map((entry) => ({ ...entry, id: entry.id as HaxMissionId }))
  .sort((left, right) => left.prime - right.prime);

const HAX_MISSION_ID_SET = new Set<HaxMissionId>(HAX_MISSION_ORDER.map((mission) => mission.id));

export function getMissionPrime(id: HaxMissionId): number {
  return HAX_MISSION_PRIMES[id];
}

export function isMissionId(value: string): value is HaxMissionId {
  return HAX_MISSION_ID_SET.has(value as HaxMissionId);
}

export function getMissionDisplayName(id: HaxMissionId): string {
  return HAX_MISSION_ORDER.find((mission) => mission.id === id)?.label ?? id;
}

export function getFirstAvailableMissionId(usedMissionIds: Iterable<HaxMissionId>): HaxMissionId | null {
  const usedIds = new Set(usedMissionIds);
  return HAX_MISSION_ORDER.find((mission) => !usedIds.has(mission.id))?.id ?? null;
}

export interface HaxMission {
  id: HaxMissionId;
  kind: 'lock' | 'time';
  timeDelta: number | null;
}

export function sortMissions(missions: HaxMission[]): HaxMission[] {
  return [...missions].sort((left, right) => getMissionPrime(left.id) - getMissionPrime(right.id));
}

export function decodeMissionData(value: number[]): HaxMission[] {
  if (value.length < 2 || value.length > 5) {
    throw new ParseError('invalid_checkpoint_shape', 'Mission arrays must contain a prime product plus up to four mission entries.');
  }

  const [encodedPrime, ...encodedValues] = value;
  if (!Number.isInteger(encodedPrime) || encodedPrime <= 0) {
    throw new ParseError('invalid_checkpoint_shape', 'Mission arrays must start with a positive integer prime product.');
  }

  let remainingPrime = encodedPrime;
  const missionIds: HaxMissionId[] = [];

  HAX_MISSION_ORDER.forEach((mission) => {
    if (remainingPrime % mission.prime !== 0) {
      return;
    }

    missionIds.push(mission.id);
    remainingPrime /= mission.prime;
  });

  if (remainingPrime !== 1 || missionIds.length !== encodedValues.length) {
    throw new ParseError('invalid_checkpoint_shape', 'Mission arrays contained an impossible prime encoding.');
  }

  return missionIds.map((id, index) => {
    const encodedValue = encodedValues[index];
    if (typeof encodedValue !== 'number') {
      throw new ParseError('invalid_checkpoint_shape', 'Mission entries must be numeric.');
    }

    if (encodedValue === HAX_LOCK_MISSION_VALUE) {
      return {
        id,
        kind: 'lock',
        timeDelta: null
      };
    }

    return {
      id,
      kind: 'time',
      timeDelta: encodedValue
    };
  });
}

export function encodeMissionData(missions: HaxMission[]): number[] {
  if (missions.length === 0) {
    throw new ParseError('invalid_checkpoint_shape', 'Mission encoding requires at least one mission.');
  }

  if (missions.length > 4) {
    throw new ParseError('invalid_checkpoint_shape', 'Hax checkpoints can encode at most four missions.');
  }

  const sorted = sortMissions(missions);
  const encodedPrime = sorted.reduce((product, mission) => product * getMissionPrime(mission.id), 1);

  return [
    encodedPrime,
    ...sorted.map((mission) =>
      mission.kind === 'lock' ? HAX_LOCK_MISSION_VALUE : mission.timeDelta ?? 0
    )
  ];
}
