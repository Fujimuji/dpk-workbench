import type { CheckpointConfig } from '@/domain/model/types';
import type { ChildEntityCategory } from '@/features/workspace/types';

export type OrbEntityKind = 'touchOrb' | 'abilityOrb' | 'lavaOrb';
export type OrbStackKind = 'touchStack' | 'abilityStack' | 'lavaStack';

export interface OrbEntityConfig {
  category: ChildEntityCategory;
  kind: OrbEntityKind;
  stackKind: OrbStackKind;
  color: string;
  softColor: string;
  label: string;
  stackLabel: string;
  getCount: (config: CheckpointConfig) => number;
}

export const ORB_ENTITY_CONFIG: Record<ChildEntityCategory, OrbEntityConfig> = {
  touch: {
    category: 'touch',
    kind: 'touchOrb',
    stackKind: 'touchStack',
    color: '#9ee5ff',
    softColor: 'rgba(53, 140, 181, 0.22)',
    label: 'Touch Orb',
    stackLabel: 'Touch Orb',
    getCount: (config) => config.touchOrbs?.length ?? 0
  },
  ability: {
    category: 'ability',
    kind: 'abilityOrb',
    stackKind: 'abilityStack',
    color: '#ffd98c',
    softColor: 'rgba(171, 120, 31, 0.22)',
    label: 'Ability Orb',
    stackLabel: 'Ability Orb',
    getCount: (config) => config.abilityOrbs?.length ?? 0
  },
  lava: {
    category: 'lava',
    kind: 'lavaOrb',
    stackKind: 'lavaStack',
    color: '#ffb38c',
    softColor: 'rgba(171, 79, 31, 0.22)',
    label: 'Lava Orb',
    stackLabel: 'Lava Orb',
    getCount: (config) => config.lava?.length ?? 0
  }
};

export const ORB_ENTITY_CONFIG_BY_KIND: Record<OrbEntityKind, OrbEntityConfig> = {
  touchOrb: ORB_ENTITY_CONFIG.touch,
  abilityOrb: ORB_ENTITY_CONFIG.ability,
  lavaOrb: ORB_ENTITY_CONFIG.lava
};

export const BOT_ENTITY_CONFIG = {
  kind: 'bot' as const,
  color: '#b8d3ff',
  softColor: 'rgba(64, 93, 155, 0.22)'
};
