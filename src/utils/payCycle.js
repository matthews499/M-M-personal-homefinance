import { format, addMonths, subMonths, parseISO } from 'date-fns'

// Pay cycle: 26th of month M → 25th of month M+1
// Each period is labeled by its ENDING month as 'YYYY-MM'

/** Returns the period ('YYYY-MM') that a given date falls in. */
export function getPeriodForDate(date = new Date()) {
  const d = typeof date === 'string' ? parseISO(date) : date
  return d.getDate() >= 26
    ? format(addMonths(d, 1), 'yyyy-MM')
    : format(d, 'yyyy-MM')
}

/** The period the app is currently in. */
export function getCurrentPeriod() {
  return getPeriodForDate(new Date())
}

/** Returns { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' } for the period. */
export function getPeriodDateRange(period) {
  const [year, month] = period.split('-').map(Number)
  // Start: 26th of previous calendar month
  const startDate = new Date(year, month - 2, 26)
  // End:   25th of this calendar month
  const endDate   = new Date(year, month - 1, 25)
  return {
    start: format(startDate, 'yyyy-MM-dd'),
    end:   format(endDate,   'yyyy-MM-dd'),
  }
}

export function getPrevPeriod(period) {
  return format(subMonths(parseISO(period + '-01'), 1), 'yyyy-MM')
}

export function getNextPeriod(period) {
  return format(addMonths(parseISO(period + '-01'), 1), 'yyyy-MM')
}

/** "June 2026" */
export function getPeriodLabel(period) {
  return format(parseISO(period + '-01'), 'MMMM yyyy')
}

/** "26 May – 25 Jun 2026" */
export function getPeriodShortRange(period) {
  const { start, end } = getPeriodDateRange(period)
  return `${format(parseISO(start), 'd MMM')} – ${format(parseISO(end), 'd MMM yyyy')}`
}

/** Returns 'YYYY-MM' n months after startPeriod (for calculating active_until). */
export function addPeriodsToString(period, n) {
  return format(addMonths(parseISO(period + '-01'), n - 1), 'yyyy-MM')
}
