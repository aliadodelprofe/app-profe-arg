import { Convocatoria, ConvocatoriaStatus, User } from '../types';

/**
 * Normalizes text for accent-insensitive and case-insensitive searching.
 * e.g., "Matías" -> "matias", "Álvarez" -> "alvarez"
 */
export function normalizeText(str: string = ''): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Computes status automatically based on class dates:
 * - 'proxima': if current date is before 1 day prior to the first class date.
 * - 'activa': from 1 day prior to the first class date up to the last class date (inclusive).
 * - 'finalizada': starting 1 day after the last class date.
 * If classDates is empty or incomplete, falls back to convocatoria.status.
 */
export function getComputedFormacionStatus(convocatoria: Convocatoria): ConvocatoriaStatus {
  const validDates = (convocatoria.classDates || []).filter(d => d && d.trim().length > 0);
  if (validDates.length === 0) {
    return convocatoria.status || 'proxima';
  }

  const firstDateStr = validDates[0];
  const lastDateStr = validDates[validDates.length - 1];

  const [fYear, fMonth, fDay] = firstDateStr.split('-').map(Number);
  if (!fYear || !fMonth || !fDay) return convocatoria.status || 'proxima';

  // 1 day before first class at 00:00:00 local time
  const firstClassDateObj = new Date(fYear, fMonth - 1, fDay, 0, 0, 0, 0);
  const activeStartDateObj = new Date(firstClassDateObj.getTime() - 24 * 60 * 60 * 1000);

  const [lYear, lMonth, lDay] = lastDateStr.split('-').map(Number);
  if (!lYear || !lMonth || !lDay) return convocatoria.status || 'proxima';

  // End of last class date (23:59:59.999)
  const lastClassEndObj = new Date(lYear, lMonth - 1, lDay, 23, 59, 59, 999);

  const now = Date.now();

  if (now < activeStartDateObj.getTime()) {
    return 'proxima';
  } else if (now > lastClassEndObj.getTime()) {
    return 'finalizada';
  } else {
    return 'activa';
  }
}

/**
 * Determines whether a formación is currently in Month 1 (classes 1..4)
 * or Month 2 (classes 5..8).
 * 
 * Rules:
 * 1. If convocatoria status is 'finalizada' -> 2 (all classes passed)
 * 2. If classDates are provided:
 *    - Check the date of class 5 (index 4). If today >= class 5 date at 00:00:00 -> Month 2.
 *    - If class 5 date doesn't exist, check class 4 (index 3). If today > end of class 4 -> Month 2.
 *    - If only class 1 date (index 0) exists: if today >= class 1 date + 28 days (4 weeks) -> Month 2.
 *    - Otherwise -> Month 1.
 * 3. Fallback to activeClassNumber: >= 5 -> Month 2, else Month 1.
 * 4. Fallback to period string month matching.
 * 5. Default -> Month 1.
 */
export function getCurrentFormationMonth(convocatoria: Convocatoria): 1 | 2 {
  if (!convocatoria) return 1;

  // 1. If already finished, both months have passed
  if (isConvocatoriaFinishedByDate(convocatoria)) {
    return 2;
  }

  const now = Date.now();
  const validDates = (convocatoria.classDates || []).map(d => d ? d.trim() : '');

  // 2. Check class 5 date (index 4)
  if (validDates[4]) {
    const [y, m, d] = validDates[4].split('-').map(Number);
    if (y && m && d) {
      const class5Start = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
      if (now >= class5Start) {
        return 2;
      } else {
        return 1;
      }
    }
  }

  // 2b. Check class 4 date (index 3)
  if (validDates[3]) {
    const [y, m, d] = validDates[3].split('-').map(Number);
    if (y && m && d) {
      const class4End = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
      if (now > class4End) {
        return 2;
      }
    }
  }

  // 2c. Check first class date + 28 days
  if (validDates[0]) {
    const [y, m, d] = validDates[0].split('-').map(Number);
    if (y && m && d) {
      const firstClassStart = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
      const month2Start = firstClassStart + (28 * 24 * 60 * 60 * 1000);
      if (now >= month2Start) {
        return 2;
      } else {
        return 1;
      }
    }
  }

  // 3. Fallback to activeClassNumber
  if (typeof convocatoria.activeClassNumber === 'number') {
    if (convocatoria.activeClassNumber >= 5) {
      return 2;
    }
    if (convocatoria.activeClassNumber >= 1) {
      return 1;
    }
  }

  // 4. Fallback to period string comparison
  if (convocatoria.period) {
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const lower = convocatoria.period.toLowerCase();
    const foundMonths: number[] = [];
    months.forEach((m, idx) => {
      if (lower.includes(m)) {
        foundMonths.push(idx);
      }
    });
    if (foundMonths.length >= 2) {
      const currentMonthIdx = new Date().getMonth();
      const secondMonthIdx = foundMonths[1];
      if (currentMonthIdx >= secondMonthIdx) {
        return 2;
      }
    }
  }

  return 1;
}

/**
 * Determines if a specific class recap (1..8) is unlocked for a given formacion.
 * Unlocks automatically if:
 * 1. The formacion status is 'finalizada'
 * 2. OR class date exists and current time >= classDate at 23:00 hs.
 * 3. OR class 1 is unlocked if active
 */
export function isRecapUnlocked(convocatoria: Convocatoria, classNumber: number): boolean {
  const status = getComputedFormacionStatus(convocatoria);
  if (status === 'finalizada') return true;

  if (convocatoria.classDates && convocatoria.classDates[classNumber - 1]) {
    const dateStr = convocatoria.classDates[classNumber - 1];
    if (dateStr && dateStr.trim()) {
      // Set unlock time to 23:00 hs on that date
      const unlockTime = new Date(`${dateStr}T23:00:00`).getTime();
      if (!isNaN(unlockTime) && Date.now() >= unlockTime) {
        return true;
      }
    }
  }

  // Class 1 unlocks if course is active
  if (classNumber === 1 && status === 'activa') return true;

  return false;
}

/**
 * Checks if the course/formacion has finished based on computed status or dates.
 */
export function isConvocatoriaFinishedByDate(convocatoria: Convocatoria): boolean {
  return getComputedFormacionStatus(convocatoria) === 'finalizada';
}

/**
 * Checks if a student qualifies for successful graduation/completion certificate.
 * True if:
 * 1. Student attended at least 6 classes (75% of 8)
 * 2. AND (the course has finished by date/status OR manually assigned)
 */
export function isStudentGraduated(convocatoria: Convocatoria, studentId: string): boolean {
  const totalClasses = convocatoria.classDates?.length || 8;
  const attendedCount = (convocatoria.attendanceMap?.[studentId] || []).length;
  const required = Math.ceil(totalClasses * 0.75);
  const meetsAttendanceRequirement = attendedCount >= required;
  const courseFinished = isConvocatoriaFinishedByDate(convocatoria);

  return meetsAttendanceRequirement && courseFinished;
}

/**
 * Checks if a user has completed Level 1 based on manually set flag OR having >= 75% attendance
 * in a finished Level 1 convocatoria.
 */
export function checkUserNivel1Completed(user: User | null | undefined, convocatorias: Convocatoria[]): boolean {
  if (!user) return false;
  if (user.nivel1Completed === true || user.nivel2Completed === true) return true;

  const n1Convocatorias = (convocatorias || []).filter(c => c.levelId === 'nivel-1' && c.studentIds?.includes(user.id));
  for (const conv of n1Convocatorias) {
    if (isConvocatoriaFinishedByDate(conv)) {
      const totalClasses = conv.classDates?.length || 8;
      const attendedCount = (conv.attendanceMap?.[user.id] || []).length;
      const required = Math.ceil(totalClasses * 0.75);
      if (attendedCount >= required) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks if a user has completed Level 2 based on manually set flag OR having >= 75% attendance
 * in a finished Level 2 convocatoria.
 */
export function checkUserNivel2Completed(user: User | null | undefined, convocatorias: Convocatoria[]): boolean {
  if (!user) return false;
  if (user.nivel2Completed === true) return true;

  const n2Convocatorias = (convocatorias || []).filter(c => c.levelId === 'nivel-2' && c.studentIds?.includes(user.id));
  for (const conv of n2Convocatorias) {
    if (isConvocatoriaFinishedByDate(conv)) {
      const totalClasses = conv.classDates?.length || 8;
      const attendedCount = (conv.attendanceMap?.[user.id] || []).length;
      const required = Math.ceil(totalClasses * 0.75);
      if (attendedCount >= required) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Formats YYYY-MM-DD to a friendly string, e.g. "Viernes 5/9" or "05/09/2025"
 */
export function formatClassDate(dateStr?: string): string {
  if (!dateStr || !dateStr.trim()) return 'Fecha no definida';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

/**
 * Calculates a timestamp score for a convocatoria to allow newest-first sorting.
 */
export function getConvocatoriaDateScore(c: Convocatoria): number {
  // 1. First class date or startDate if available
  const firstDateStr = (c.classDates && c.classDates[0] && c.classDates[0].trim()) || (c.startDate && c.startDate.trim());
  if (firstDateStr) {
    const d = new Date(firstDateStr).getTime();
    if (!isNaN(d) && d > 0) return d;
  }

  // 2. Parse year & month from period string e.g. "Septiembre — Noviembre 2025" or "Agosto 2026"
  if (c.period) {
    const yearMatch = c.period.match(/\b(20\d\d)\b/);
    if (yearMatch) {
      let monthIndex = 0;
      const lower = c.period.toLowerCase();
      const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      for (let i = 0; i < months.length; i++) {
        if (lower.includes(months[i])) {
          monthIndex = i;
          break;
        }
      }
      return new Date(parseInt(yearMatch[1], 10), monthIndex, 1).getTime();
    }
  }

  // 3. Fallback to timestamp inside ID (e.g., conv-1723456789)
  const idNumMatch = c.id.match(/\d{10,}/);
  if (idNumMatch) {
    const idTs = parseInt(idNumMatch[0], 10);
    if (!isNaN(idTs)) return idTs;
  }

  return 0;
}

/**
 * Sorts convocatorias so that the most recent ones appear first.
 */
export function sortConvocatoriasNewestFirst(a: Convocatoria, b: Convocatoria): number {
  const scoreA = getConvocatoriaDateScore(a);
  const scoreB = getConvocatoriaDateScore(b);

  if (scoreA !== scoreB) {
    return scoreB - scoreA; // Descending (newest date score first)
  }

  const numA = parseInt(a.id.replace(/\D/g, '') || '0', 10);
  const numB = parseInt(b.id.replace(/\D/g, '') || '0', 10);
  if (numA !== numB && numA > 0 && numB > 0) {
    return numB - numA;
  }

  return b.id.localeCompare(a.id);
}

