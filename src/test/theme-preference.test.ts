import { describe, expect, it } from 'vitest';
import {
  THEME_OVERRIDE_STORAGE_KEY,
  createThemePreferenceController
} from '../app/themePreference';

function createMemoryStorage(options: { failGet?: boolean; failSet?: boolean } = {}) {
  const values = new Map<string, string>();

  return {
    getItem(key: string): string | null {
      if (options.failGet) {
        throw new Error('get failed');
      }

      return values.get(key) ?? null;
    },
    removeItem(key: string): void {
      if (options.failSet) {
        throw new Error('remove failed');
      }

      values.delete(key);
    },
    setItem(key: string, value: string): void {
      if (options.failSet) {
        throw new Error('set failed');
      }

      values.set(key, value);
    }
  };
}

function createMediaQueryList(matches: boolean) {
  const listeners = new Set<(event: { matches: boolean }) => void>();

  return {
    addEventListener(_type: 'change', listener: (event: { matches: boolean }) => void): void {
      listeners.add(listener);
    },
    matches,
    removeEventListener(_type: 'change', listener: (event: { matches: boolean }) => void): void {
      listeners.delete(listener);
    },
    setMatches(nextMatches: boolean): void {
      this.matches = nextMatches;
      listeners.forEach((listener) => listener({ matches: nextMatches }));
    }
  };
}

function createThemeRoot(): HTMLElement {
  return {
    dataset: {},
    style: {
      colorScheme: ''
    }
  } as unknown as HTMLElement;
}

describe('theme preference helpers', () => {
  it('reads a stored override before falling back to system preference', () => {
    const storage = createMemoryStorage();
    const root = createThemeRoot();
    const mediaQueryList = createMediaQueryList(true);

    storage.setItem(THEME_OVERRIDE_STORAGE_KEY, 'light');

    const controller = createThemePreferenceController({ mediaQueryList, root, storage });

    expect(controller.getSnapshot()).toEqual({
      resolvedTheme: 'light',
      storedThemeOverride: 'light'
    });
    expect(root.dataset.theme).toBe('light');
    expect(root.style.colorScheme).toBe('light');

    controller.dispose();
  });

  it('falls back to the current system preference when no override exists', () => {
    const controller = createThemePreferenceController({
      mediaQueryList: createMediaQueryList(true),
      root: createThemeRoot(),
      storage: createMemoryStorage()
    });

    expect(controller.getSnapshot()).toEqual({
      resolvedTheme: 'dark',
      storedThemeOverride: null
    });

    controller.dispose();
  });

  it('updates the stored override when the user switches themes', () => {
    const storage = createMemoryStorage();
    const root = createThemeRoot();
    const controller = createThemePreferenceController({
      mediaQueryList: createMediaQueryList(false),
      root,
      storage
    });

    controller.setThemeOverride('dark');

    expect(controller.getSnapshot()).toEqual({
      resolvedTheme: 'dark',
      storedThemeOverride: 'dark'
    });
    expect(storage.getItem(THEME_OVERRIDE_STORAGE_KEY)).toBe('dark');
    expect(root.dataset.theme).toBe('dark');

    controller.dispose();
  });

  it('tolerates unavailable local storage', () => {
    const root = createThemeRoot();
    const controller = createThemePreferenceController({
      mediaQueryList: createMediaQueryList(false),
      root,
      storage: createMemoryStorage({ failGet: true, failSet: true })
    });

    expect(controller.getSnapshot()).toEqual({
      resolvedTheme: 'light',
      storedThemeOverride: null
    });

    expect(() => controller.setThemeOverride('dark')).not.toThrow();
    expect(root.dataset.theme).toBe('dark');

    controller.dispose();
  });

  it('follows system theme changes only while no override is stored', () => {
    const mediaQueryList = createMediaQueryList(false);
    const controller = createThemePreferenceController({
      mediaQueryList,
      root: createThemeRoot(),
      storage: createMemoryStorage()
    });

    expect(controller.getSnapshot().resolvedTheme).toBe('light');

    mediaQueryList.setMatches(true);
    expect(controller.getSnapshot().resolvedTheme).toBe('dark');

    controller.setThemeOverride('light');
    mediaQueryList.setMatches(false);
    mediaQueryList.setMatches(true);

    expect(controller.getSnapshot()).toEqual({
      resolvedTheme: 'light',
      storedThemeOverride: 'light'
    });

    controller.dispose();
  });
});
