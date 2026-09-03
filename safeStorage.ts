/**
 * Safe localStorage utilities that handle QuotaExceededError and private browsing restrictions.
 * Prevents application crashes when the browser's storage limit is reached.
 */

const NON_CRITICAL_KEYS = [
  'bachata_users_list_v1',
  'bachata_convocatorias_v1',
  'bachata_merch_orders_v1',
  'bachata_merch_products_v1',
  'bachata_announcements_v1',
  'bachata_benefits_v1',
  'bachata_formations_v1',
  'bachata_regular_classes_v1',
  'bachata_cleared_notifs_v1',
  'bachata_read_notifs_v1',
];

export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error: any) {
    const isQuotaError =
      error?.name === 'QuotaExceededError' ||
      error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error?.code === 22 ||
      error?.code === 1014 ||
      (error?.message && error.message.toLowerCase().includes('quota'));

    if (isQuotaError) {
      console.warn(`[SafeStorage] Quota exceeded while writing "${key}". Attempting cache cleanup...`);
      try {
        // Remove non-critical cached collections to free up space
        for (const nonCritKey of NON_CRITICAL_KEYS) {
          if (nonCritKey !== key) {
            localStorage.removeItem(nonCritKey);
          }
        }
        // Try writing the item again after cleanup
        localStorage.setItem(key, value);
        console.log(`[SafeStorage] Successfully saved "${key}" after storage cleanup.`);
        return true;
      } catch (retryError) {
        // If it still fails, fail gracefully without throwing to prevent React ErrorBoundary crashes
        console.warn(`[SafeStorage] Could not cache "${key}" even after cleanup. Skipping offline cache.`);
        return false;
      }
    } else {
      console.warn(`[SafeStorage] localStorage.setItem failed for "${key}":`, error);
      return false;
    }
  }
}

export function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`[SafeStorage] localStorage.getItem failed for "${key}":`, error);
    return null;
  }
}

export function safeLocalStorageRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`[SafeStorage] localStorage.removeItem failed for "${key}":`, error);
  }
}

export function safeClearCachePreservingSession(): void {
  try {
    const userSession = safeLocalStorageGet('bachata_current_user_v1');
    const siteConfig = safeLocalStorageGet('bachata_site_config_v1');
    
    localStorage.clear();
    
    if (userSession) {
      safeLocalStorageSet('bachata_current_user_v1', userSession);
    }
    if (siteConfig) {
      safeLocalStorageSet('bachata_site_config_v1', siteConfig);
    }
  } catch (e) {
    console.warn('[SafeStorage] Could not clear cache safely:', e);
  }
}
