// Helpers for calendar days ("2026-03-14") used in query filters.
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDay(value: string): boolean {
  return DAY_PATTERN.test(value) && !Number.isNaN(startOfDay(value).getTime());
}

export function startOfDay(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
