import { addDays, format } from 'date-fns'

export function calculateDueDate(assignedDate: Date | string): Date {
  const date = typeof assignedDate === 'string' ? new Date(assignedDate) : assignedDate
  return addDays(date, 7)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'yyyy-MM-dd')
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'MMM dd, yyyy HH:mm')
}

export function calculatePercentage(obtained: number, total: number): number {
  if (total === 0) return 0
  return Math.round((obtained / total) * 100 * 100) / 100 // Round to 2 decimal places
}

