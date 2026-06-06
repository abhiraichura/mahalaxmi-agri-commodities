// src/utils/cacheManager.ts

const BUILD_VERSION = '1.0.0'; // Bump this manually on every deploy

export function getBuildVersion(): string {
  return BUILD_VERSION;
}

/**
 * Clears all app caches, storage, and service workers.
 * Firebase data is server-side — 100% safe.
 */
export async function clearAppCache(): Promise<void> {
  // 1. Unregister all service workers
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(reg => reg.unregister()));
  }

  // 2. Clear Cache Storage
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
  }

  // 3. Clear localStorage (keep nothing app-related)
  const keysToKeep: string[] = [];
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && !keysToKeep.includes(key)) {
      localStorage.removeItem(key);
    }
  }

  // 4. Clear sessionStorage
  sessionStorage.clear();

  // 5. Hard reload from server (forces fresh fetch, no cache)
  // Use reload() with cache-bust header via no-cache fetch first
  try {
    await fetch(window.location.href, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
  } catch (e) {
    // ignore
  }
  window.location.reload();
}

/**
 * Check if a new version is available.
 */
export function checkForUpdate(): boolean {
  const stored = localStorage.getItem('app_version');
  if (!stored) {
    localStorage.setItem('app_version', BUILD_VERSION);
    return false;
  }
  if (stored !== BUILD_VERSION) {
    return true;
  }
  return false;
}

export function markVersionSeen(): void {
  localStorage.setItem('app_version', BUILD_VERSION);
}
