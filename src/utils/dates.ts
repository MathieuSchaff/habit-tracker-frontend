import { subDays, format, differenceInDays } from "date-fns";

/**
 * Retourne une date au format ISO (YYYY-MM-DD) avec un offset en jours
 * @param daysAgo - Nombre de jours dans le passé (0 = aujourd'hui, 1 = hier, etc)
 */
export function getDate(daysAgo: number = 0): string {
  const date = subDays(new Date(), daysAgo);
  return format(date, "yyyy-MM-dd");
}

/**
 * Retourne aujourd'hui au format ISO
 */
export function getToday(): string {
  return getDate(0);
}

/**
 * Retourne hier au format ISO
 */
export function getYesterday(): string {
  return getDate(1);
}

// Alias pour les tests
export const getTestDate = getDate;

// Helpers bonus
export function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

export function getDaysBetween(start: string, end: string): number {
  return differenceInDays(new Date(end), new Date(start));
}
