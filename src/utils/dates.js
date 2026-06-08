import { startOfMonth, addMonths, differenceInCalendarMonths, format, parseISO } from 'date-fns'

export function currentMonthStart() {
  return startOfMonth(new Date())
}

// Returns 'YYYY-MM-01' string — used as the month key in DB rows
export function monthParam(date = new Date()) {
  return format(startOfMonth(date), 'yyyy-MM-dd')
}

// Human-readable month label e.g. "June 2026"
export function monthLabel(date = new Date()) {
  return format(startOfMonth(date), 'MMMM yyyy')
}

// How many whole months remain from today until targetDate (minimum 1)
// Guards against null / undefined / invalid dates — Math.max(NaN, 1) === NaN
// in JavaScript so we must check explicitly.
export function monthsUntil(targetDate) {
  if (!targetDate) return 1
  const target = typeof targetDate === 'string' ? parseISO(targetDate) : targetDate
  const diff = differenceInCalendarMonths(target, currentMonthStart())
  return isNaN(diff) ? 1 : Math.max(diff, 1)
}

// Ordinal suffix: 1 → "1st", 26 → "26th"
export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}
