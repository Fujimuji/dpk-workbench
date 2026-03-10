import { useEffect, useState } from 'react';
import {
  createThemePreferenceController,
  type ThemeMode,
  type ThemeOverride
} from '@/app/themePreference';

export interface ThemePreferenceApi {
  resolvedTheme: ThemeMode;
  setTheme: (value: ThemeMode) => void;
  storedThemeOverride: ThemeOverride;
}

export function useThemePreference(): ThemePreferenceApi {
  const [controller] = useState(() => createThemePreferenceController());
  const [snapshot, setSnapshot] = useState(() => controller.getSnapshot());

  useEffect(() => {
    const unsubscribe = controller.subscribe(() => {
      setSnapshot(controller.getSnapshot());
    });

    return () => {
      unsubscribe();
      controller.dispose();
    };
  }, [controller]);

  return {
    resolvedTheme: snapshot.resolvedTheme,
    setTheme(value) {
      controller.setThemeOverride(value);
    },
    storedThemeOverride: snapshot.storedThemeOverride
  };
}
