import type { WorkshopColor } from '@/domain/model/types';

export const WORKSHOP_COLORS: WorkshopColor[] = [
  'Aqua',
  'Blue',
  'Green',
  'Lime Green',
  'Orange',
  'Purple',
  'Red',
  'Sky Blue',
  'Turquoise',
  'White',
  'Yellow',
  'Black',
  'Gray',
  'Rose',
  'Violet'
];

const AUTHORED_LEVEL_NAME_POOL = [
  'Warmup',
  'Launch',
  'Transfer',
  'Climb',
  'Control',
  'Precision',
  'Traverse',
  'Finale'
] as const;

const WORKSHOP_COLOR_VALUES: Record<WorkshopColor, [number, number, number, number]> = {
  Aqua: [0, 234, 234, 255],
  Blue: [39, 170, 255, 255],
  Green: [69, 255, 87, 255],
  'Lime Green': [160, 232, 27, 255],
  Orange: [236, 153, 0, 255],
  Purple: [161, 73, 197, 255],
  Red: [200, 0, 19, 255],
  'Sky Blue': [108, 190, 244, 255],
  Turquoise: [0, 230, 151, 255],
  White: [255, 255, 255, 255],
  Yellow: [255, 255, 0, 255],
  Black: [0, 0, 0, 255],
  Gray: [127, 127, 127, 255],
  Rose: [255, 50, 145, 255],
  Violet: [100, 50, 255, 255]
};

export function getDefaultLevelName(levelIndex: number): string {
  return `Level ${levelIndex + 1}`;
}

export function getNextAuthoredLevelName(existingNames: string[]): string {
  const usedNames = new Set(existingNames);
  let cycle = 1;

  while (true) {
    for (const baseName of AUTHORED_LEVEL_NAME_POOL) {
      const candidate = cycle === 1 ? baseName : `${baseName} ${cycle}`;
      if (!usedNames.has(candidate)) {
        return candidate;
      }
    }

    cycle += 1;
  }
}

export function getDefaultLevelColor(levelIndex: number): WorkshopColor {
  return WORKSHOP_COLORS[levelIndex % WORKSHOP_COLORS.length];
}

export function getWorkshopColorCss(color: WorkshopColor, alpha = 1): string {
  const [red, green, blue, sourceAlpha] = WORKSHOP_COLOR_VALUES[color];
  return `rgba(${red}, ${green}, ${blue}, ${(sourceAlpha / 255) * alpha})`;
}
