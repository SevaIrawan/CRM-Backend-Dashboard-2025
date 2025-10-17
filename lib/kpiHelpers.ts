/**
 * KPI Helper Functions
 * Pure utility functions for KPI display and formatting
 * No database queries - only calculations and formatting
 */

/**
 * Get color for comparison value (MoM, percentage, etc)
 * @param value - Numeric value to determine color
 * @returns Hex color code (green for positive, red for negative, gray for zero)
 */
export function getComparisonColor(value: number): string {
  const num = Number(value) || 0
  return num > 0 ? '#059669' : num < 0 ? '#dc2626' : '#6b7280'
}

/**
 * Format Month-over-Month value with + or - sign
 * @param value - MoM percentage value
 * @returns Formatted string with sign and percentage
 */
export function formatMoMValue(value: number): string {
  const num = Number(value) || 0
  return num > 0 ? `+${num.toFixed(1)}%` : `${num.toFixed(1)}%`
}

/**
 * Get month order index for sorting
 * @param month - Month name
 * @returns Month index (1-12)
 */
export function getMonthOrder(month: string): number {
  const monthOrder: { [key: string]: number } = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4,
    'May': 5, 'June': 6, 'July': 7, 'August': 8,
    'September': 9, 'October': 10, 'November': 11, 'December': 12
  }
  return monthOrder[month] || 0
}

/**
 * Get month index (1-based) from month name
 * @param month - Month name (e.g., "January")
 * @returns Month index (1-12)
 */
export function getMonthIndex(month: string): number {
  const months = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4,
    'May': 5, 'June': 6, 'July': 7, 'August': 8,
    'September': 9, 'October': 10, 'November': 11, 'December': 12
  }
  return months[month as keyof typeof months] || 1
}

/**
 * Sort months chronologically
 * @param months - Array of month names
 * @returns Sorted array of month names
 */
export function sortMonths(months: string[]): string[] {
  return months.sort((a, b) => getMonthOrder(a) - getMonthOrder(b))
}

/**
 * Get all month names
 * @returns Array of all month names
 */
export function getAllMonths(): string[] {
  return [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
}

