export function isPerfLoggingEnabled(): boolean {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem('parkour:perf') === '1';
  } catch {
    return false;
  }
}

export function measureWithPerf<T>(label: string, run: () => T): T {
  if (!isPerfLoggingEnabled()) {
    return run();
  }

  const start = performance.now();

  try {
    return run();
  } finally {
    console.info(`[parkour:perf] ${label}: ${(performance.now() - start).toFixed(2)}ms`);
  }
}
