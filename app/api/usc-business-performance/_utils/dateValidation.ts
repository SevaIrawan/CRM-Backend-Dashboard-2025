/**
 * Date Range Validation Utilities for USC Business Performance APIs
 * Ensures consistent date validation across all APIs
 */

/**
 * Validate date format (YYYY-MM-DD)
 */
export function validateDateFormat(dateStr: string | null): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false
  
  // Check format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateStr)) return false
  
  // Check if it's a valid date
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return false
  
  // Check if date string matches the parsed date (prevents invalid dates like 2024-13-40)
  const [year, month, day] = dateStr.split('-').map(Number)
  return date.getFullYear() === year && 
         date.getMonth() + 1 === month && 
         date.getDate() === day
}

/**
 * Validate date range (startDate <= endDate)
 */
export function validateDateRange(startDate: string, endDate: string): { valid: boolean; error?: string } {
  if (!startDate || !endDate) {
    return { valid: false, error: 'Start date and end date are required' }
  }
  
  if (!validateDateFormat(startDate)) {
    return { valid: false, error: `Invalid start date format: ${startDate}. Expected YYYY-MM-DD` }
  }
  
  if (!validateDateFormat(endDate)) {
    return { valid: false, error: `Invalid end date format: ${endDate}. Expected YYYY-MM-DD` }
  }
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  if (start > end) {
    return { valid: false, error: `Start date (${startDate}) must be less than or equal to end date (${endDate})` }
  }
  
  return { valid: true }
}

/**
 * Validate Period A and Period B date ranges
 */
export function validatePeriodRanges(
  periodAStart: string | null,
  periodAEnd: string | null,
  periodBStart: string | null,
  periodBEnd: string | null
): { valid: boolean; error?: string } {
  // Check all dates are provided
  if (!periodAStart || !periodAEnd || !periodBStart || !periodBEnd) {
    return { valid: false, error: 'All period dates are required: periodAStart, periodAEnd, periodBStart, periodBEnd' }
  }
  
  // Validate Period A range
  const periodAValidation = validateDateRange(periodAStart, periodAEnd)
  if (!periodAValidation.valid) {
    return { valid: false, error: `Period A: ${periodAValidation.error}` }
  }
  
  // Validate Period B range
  const periodBValidation = validateDateRange(periodBStart, periodBEnd)
  if (!periodBValidation.valid) {
    return { valid: false, error: `Period B: ${periodBValidation.error}` }
  }
  
  // Optional: Validate that Period B is after Period A (business logic)
  const periodAEndDate = new Date(periodAEnd)
  const periodBStartDate = new Date(periodBStart)
  
  if (periodAEndDate > periodBStartDate) {
    // This is a warning, not an error - periods can overlap
    console.warn(`⚠️ Period A end (${periodAEnd}) is after Period B start (${periodBStart}). Periods may overlap.`)
  }
  
  return { valid: true }
}

/**
 * Validate single date range (for main data API)
 */
export function validateSingleDateRange(
  startDate: string | null,
  endDate: string | null
): { valid: boolean; error?: string } {
  if (!startDate || !endDate) {
    return { valid: false, error: 'Both startDate and endDate are required' }
  }
  
  return validateDateRange(startDate, endDate)
}

