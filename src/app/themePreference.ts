export type ThemeMode = 'light' | 'dark';
export type ThemeOverride = ThemeMode | null;

export interface ThemePreferenceSnapshot {
  resolvedTheme: ThemeMode;
  storedThemeOverride: ThemeOverride;
}

export interface ThemePreferenceController {
  dispose: () => void;
  getSnapshot: () => ThemePreferenceSnapshot;
  setThemeOverride: (value: ThemeOverride) => void;
  subscribe: (listener: () => void) => () => void;
}

export const THEME_OVERRIDE_STORAGE_KEY = 'parkour-data-converter.theme-override';

interface StorageLike {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

export interface ThemeMediaQueryListLike {
  addEventListener?: (type: 'change', listener: (event: { matches: boolean }) => void) => void;
  addListener?: (listener: (event: { matches: boolean }) => void) => void;
  matches: boolean;
  removeEventListener?: (type: 'change', listener: (event: { matches: boolean }) => void) => void;
  removeListener?: (listener: (event: { matches: boolean }) => void) => void;
}

interface ThemePreferenceControllerOptions {
  mediaQueryList?: ThemeMediaQueryListLike | null;
  root?: HTMLElement | null;
  storage?: StorageLike;
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

function getThemeStorage(storage?: StorageLike): StorageLike | null {
  if (storage) {
    return storage;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getSystemThemeMediaQueryList(): ThemeMediaQueryListLike | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null;
  }

  return window.matchMedia('(prefers-color-scheme: dark)');
}

export function readStoredThemeOverride(storage?: StorageLike): ThemeOverride {
  const themeStorage = getThemeStorage(storage);
  if (!themeStorage) {
    return null;
  }

  try {
    const rawValue = themeStorage.getItem(THEME_OVERRIDE_STORAGE_KEY);
    return isThemeMode(rawValue) ? rawValue : null;
  } catch {
    return null;
  }
}

export function writeStoredThemeOverride(value: ThemeOverride, storage?: StorageLike): boolean {
  const themeStorage = getThemeStorage(storage);
  if (!themeStorage) {
    return false;
  }

  try {
    if (value === null) {
      themeStorage.removeItem(THEME_OVERRIDE_STORAGE_KEY);
    } else {
      themeStorage.setItem(THEME_OVERRIDE_STORAGE_KEY, value);
    }
    return true;
  } catch {
    return false;
  }
}

export function resolveThemeMode(
  storedThemeOverride: ThemeOverride,
  mediaQueryList?: ThemeMediaQueryListLike | null
): ThemeMode {
  if (storedThemeOverride) {
    return storedThemeOverride;
  }

  return mediaQueryList?.matches ? 'dark' : 'light';
}

export function applyThemeToDocument(theme: ThemeMode, root?: HTMLElement | null): void {
  const themeRoot = root ?? (typeof document !== 'undefined' ? document.documentElement : null);
  if (!themeRoot) {
    return;
  }

  themeRoot.dataset.theme = theme;
  themeRoot.style.colorScheme = theme;
}

export function bootstrapThemePreference(options: ThemePreferenceControllerOptions = {}): ThemePreferenceSnapshot {
  const storedThemeOverride = readStoredThemeOverride(options.storage);
  const resolvedTheme = resolveThemeMode(
    storedThemeOverride,
    options.mediaQueryList ?? getSystemThemeMediaQueryList()
  );

  applyThemeToDocument(resolvedTheme, options.root);

  return {
    resolvedTheme,
    storedThemeOverride
  };
}

export function createThemePreferenceController(
  options: ThemePreferenceControllerOptions = {}
): ThemePreferenceController {
  const mediaQueryList = options.mediaQueryList ?? getSystemThemeMediaQueryList();
  const listeners = new Set<() => void>();
  let storedThemeOverride = readStoredThemeOverride(options.storage);
  let resolvedTheme = resolveThemeMode(storedThemeOverride, mediaQueryList);

  applyThemeToDocument(resolvedTheme, options.root);

  const emitChange = () => {
    listeners.forEach((listener) => listener());
  };

  const handleMediaQueryChange = () => {
    if (storedThemeOverride !== null) {
      return;
    }

    const nextResolvedTheme = resolveThemeMode(null, mediaQueryList);
    if (nextResolvedTheme === resolvedTheme) {
      return;
    }

    resolvedTheme = nextResolvedTheme;
    applyThemeToDocument(resolvedTheme, options.root);
    emitChange();
  };

  mediaQueryList?.addEventListener?.('change', handleMediaQueryChange);
  mediaQueryList?.addListener?.(handleMediaQueryChange);

  return {
    dispose() {
      mediaQueryList?.removeEventListener?.('change', handleMediaQueryChange);
      mediaQueryList?.removeListener?.(handleMediaQueryChange);
      listeners.clear();
    },
    getSnapshot() {
      return {
        resolvedTheme,
        storedThemeOverride
      };
    },
    setThemeOverride(value) {
      const nextResolvedTheme = resolveThemeMode(value, mediaQueryList);
      const didChange = storedThemeOverride !== value || resolvedTheme !== nextResolvedTheme;

      storedThemeOverride = value;
      resolvedTheme = nextResolvedTheme;
      writeStoredThemeOverride(value, options.storage);
      applyThemeToDocument(resolvedTheme, options.root);

      if (didChange) {
        emitChange();
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
  };
}
