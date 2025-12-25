/**
 * Date utilities for Suriname timezone (America/Paramaribo, UTC-3)
 * All date operations should use this timezone for consistency
 *
 * NOTE: We use interval arithmetic instead of AT TIME ZONE 'America/Paramaribo'
 * because some PostgreSQL installations have incorrect timezone data.
 * Suriname is UTC-3 (3 hours behind UTC), so we subtract 3 hours from UTC.
 */

export const TIMEZONE = 'America/Paramaribo';

// Suriname offset: UTC-3 means subtract 3 hours from UTC
export const TIMEZONE_OFFSET_HOURS = 3;

/**
 * SQL expression to convert a TIMESTAMPTZ column to Suriname local date
 * Use this in WHERE clauses for date filtering
 * Example: `WHERE ${toSurinameDate('date_completed')} = $1`
 */
export function toSurinameDate(column: string): string {
  return `DATE(${column} - INTERVAL '${TIMEZONE_OFFSET_HOURS} hours')`;
}

/**
 * SQL expression to convert a TIMESTAMPTZ column to Suriname local timestamp
 * Use this in SELECT clauses for display
 * Example: `SELECT ${toSurinameTimestamp('date_completed')} as local_time`
 */
export function toSurinameTimestamp(column: string): string {
  return `(${column} - INTERVAL '${TIMEZONE_OFFSET_HOURS} hours')`;
}

/**
 * Get today's date in YYYY-MM-DD format in Suriname timezone
 */
export function getTodayDateString(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}

/**
 * Convert a Date object to YYYY-MM-DD string in Suriname timezone
 */
export function toLocalDateString(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Get the start of day in Suriname timezone as a UTC timestamp
 * Useful for database queries that need timestamp ranges
 */
export function getStartOfDayUTC(dateString: string): Date {
  // Parse the date string as a date in Suriname timezone
  // Suriname is UTC-3, so add 3 hours to get UTC
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0));
  return date;
}

/**
 * Get the end of day in Suriname timezone as a UTC timestamp
 * Useful for database queries that need timestamp ranges
 */
export function getEndOfDayUTC(dateString: string): Date {
  // Parse the date string and add 27 hours (3 for timezone + 24 for full day)
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 26, 59, 59, 999));
  return date;
}

/**
 * Format a date for display in Suriname timezone
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
