/**
 * Formats a timestamp or date string into a clean Spanish relative time string
 * (e.g., "Hace un instante", "Hace 5 min", "Hace 2 horas", "Hace 3 días").
 * Can also extract timestamp from ID string (e.g., 'ann-1785200000000' or 'c-1785450000000').
 */
export function formatRelativeTime(dateVal?: number | string | null, entityId?: string): string {
  let timestamp: number | null = null;

  // 1. If dateVal is a numeric timestamp
  if (typeof dateVal === 'number' && !isNaN(dateVal) && dateVal > 1000000000000) {
    timestamp = dateVal;
  }
  // 2. If dateVal is a numeric string (e.g. "1723456789123")
  else if (typeof dateVal === 'string' && /^\d{13}$/.test(dateVal.trim())) {
    timestamp = Number(dateVal.trim());
  }
  // 3. If dateVal is an ISO string or parseable Date string
  else if (
    typeof dateVal === 'string' &&
    dateVal.trim() &&
    dateVal.trim() !== 'Reciente' &&
    dateVal.trim() !== 'Hace un instante' &&
    dateVal.trim() !== 'Completado'
  ) {
    const parsed = Date.parse(dateVal);
    if (!isNaN(parsed) && parsed > 1000000000000) {
      timestamp = parsed;
    }
  }

  // 4. Fallback: Extract timestamp from ID if entityId matches 'ann-1723456789000' or 'c-1723456789000'
  if (!timestamp && entityId) {
    const match = entityId.match(/(?:ann|c|user|ben)-(\d{13})/);
    if (match && match[1]) {
      const extracted = Number(match[1]);
      if (!isNaN(extracted) && extracted > 1000000000000) {
        timestamp = extracted;
      }
    }
  }

  // 5. Fallback for static demo IDs like 'ann-1', 'ann-2', 'c-1', 'c-2'
  if (!timestamp && entityId) {
    const staticMatch = entityId.match(/(?:ann|c)-(\d+)/);
    if (staticMatch && staticMatch[1]) {
      const idx = Number(staticMatch[1]);
      if (!isNaN(idx)) {
        // Offset by 2 days * idx so posts and comments show realistic ages ("Hace 2 días", "Hace 4 días", etc.)
        timestamp = Date.now() - (idx * 2 * 24 * 60 * 60 * 1000 + 3600000);
      }
    }
  }

  // Fallback if no timestamp could be resolved:
  if (!timestamp) {
    if (typeof dateVal === 'string' && dateVal.trim() && dateVal.trim() !== 'Reciente' && dateVal.trim() !== 'Hace un instante') {
      return dateVal.trim();
    }
    // If it's literally "Reciente" or "Hace un instante" without timestamp, default to 1-2 days for older items
    if (entityId) {
      return 'Hace 2 días';
    }
    return 'Hace un instante';
  }

  const now = Date.now();
  const diffMs = now - timestamp;

  if (diffMs < 0 || diffMs < 60000) {
    return 'Hace un instante';
  }

  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 60) {
    return `Hace ${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `Hace ${days} ${days === 1 ? 'día' : 'días'}`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return `Hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `Hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
  }

  const years = Math.floor(days / 365);
  return `Hace ${years} ${years === 1 ? 'año' : 'años'}`;
}

/**
 * Formats a user's registration/creation date into uppercase "MES AÑO" in Spanish
 * (e.g. "ABRIL 2026", "AGOSTO 2026", "MARZO 2024").
 * Inspects `user.createdAt`, timestamp from `user.id`, Firestore Timestamps, or converts legacy strings.
 */
export function formatMemberSinceDate(user?: { createdAt?: any; memberSince?: string; id?: string } | null): string {
  if (!user) {
    const now = new Date();
    const month = now.toLocaleDateString('es-AR', { month: 'long' }).toUpperCase();
    return `${month} ${now.getFullYear()}`;
  }

  let dateObj: Date | null = null;

  // 1. If createdAt is provided (numeric timestamp, ISO string, or Firestore Timestamp)
  if (user.createdAt) {
    if (typeof user.createdAt === 'number' && !isNaN(user.createdAt) && user.createdAt > 0) {
      dateObj = new Date(user.createdAt);
    } else if (typeof user.createdAt === 'string') {
      const parsed = Date.parse(user.createdAt);
      if (!isNaN(parsed) && parsed > 0) {
        dateObj = new Date(parsed);
      } else {
        const num = Number(user.createdAt);
        if (!isNaN(num) && num > 0) dateObj = new Date(num);
      }
    } else if (typeof user.createdAt === 'object') {
      if (typeof user.createdAt?.toDate === 'function') {
        dateObj = user.createdAt.toDate();
      } else if (typeof user.createdAt?.seconds === 'number') {
        dateObj = new Date(user.createdAt.seconds * 1000);
      }
    }
  }

  // 2. If no valid dateObj from createdAt, extract timestamp from user.id (e.g. "user-1714123456789")
  if (!dateObj && user.id && user.id.startsWith('user-')) {
    const idNum = Number(user.id.replace('user-', ''));
    if (!isNaN(idNum) && idNum > 1000000000000) {
      dateObj = new Date(idNum);
    }
  }

  // 3. If dateObj is valid, format as MES AÑO (e.g. "ABRIL 2026")
  if (dateObj && !isNaN(dateObj.getTime())) {
    const month = dateObj.toLocaleDateString('es-AR', { month: 'long' }).toUpperCase();
    const year = dateObj.getFullYear();
    return `${month} ${year}`;
  }

  // 4. If memberSince is already stored and is not 'Reciente'
  if (user.memberSince && typeof user.memberSince === 'string') {
    const trimmed = user.memberSince.trim();
    if (trimmed && trimmed.toLowerCase() !== 'reciente') {
      return trimmed.toUpperCase();
    }
  }

  // 5. Default fallback to current month & year in uppercase MES AÑO
  const now = new Date();
  const month = now.toLocaleDateString('es-AR', { month: 'long' }).toUpperCase();
  return `${month} ${now.getFullYear()}`;
}

