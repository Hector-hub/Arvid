// Fechas de calendario locales como texto 'YYYY-MM-DD' (game-design R-T2).
// La aritmética se hace con días desde la época en UTC para no depender de la zona horaria ni del horario de verano.

export type LocalDate = string & { readonly __brand: 'LocalDate' };

const PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

export function isLocalDate(value: string): value is LocalDate {
  const match = PATTERN.exec(value);
  if (!match) return false;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  return date.getUTCFullYear() === Number(y) && date.getUTCMonth() === Number(m) - 1 && date.getUTCDate() === Number(d);
}

export function asLocalDate(value: string): LocalDate {
  if (!isLocalDate(value)) throw new Error(`Fecha local inválida: ${value}`);
  return value;
}

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0');
}

function parts(date: LocalDate): [number, number, number] {
  return [Number(date.slice(0, 4)), Number(date.slice(5, 7)), Number(date.slice(8, 10))];
}

/** Fecha local del instante dado, según la zona horaria del entorno (R-T1). */
export function toLocalDate(instant: Date): LocalDate {
  return `${pad(instant.getFullYear(), 4)}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())}` as LocalDate;
}

export function toEpochDay(date: LocalDate): number {
  const [y, m, d] = parts(date);
  return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

export function fromEpochDay(day: number): LocalDate {
  const date = new Date(day * MS_PER_DAY);
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}` as LocalDate;
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return fromEpochDay(toEpochDay(date) + days);
}

/** Días de `from` a `to` (positivo si `to` es posterior). */
export function diffDays(from: LocalDate, to: LocalDate): number {
  return toEpochDay(to) - toEpochDay(from);
}

/** Día de la semana ISO: 1 = lunes … 7 = domingo. */
export function isoWeekday(date: LocalDate): number {
  // 1970-01-01 fue jueves (ISO 4).
  const day = toEpochDay(date);
  return ((((day + 3) % 7) + 7) % 7) + 1;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function startOfMonth(date: LocalDate): LocalDate {
  return `${date.slice(0, 8)}01` as LocalDate;
}

export function endOfMonth(date: LocalDate): LocalDate {
  const [y, m] = parts(date);
  return `${date.slice(0, 8)}${pad(daysInMonth(y, m))}` as LocalDate;
}

export function compareDates(a: LocalDate, b: LocalDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Desfase de la zona horaria local en minutos respecto a UTC (positivo al este). */
export function tzOffsetMinutes(instant: Date): number {
  return -instant.getTimezoneOffset() || 0;
}
