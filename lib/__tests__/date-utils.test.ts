import { describe, it, expect } from 'vitest'
import {
  calculateDueDate,
  formatDate,
  formatDateTime,
  calculatePercentage,
} from '../date-utils'

describe('date-utils', () => {
  describe('calculateDueDate', () => {
    it('should calculate due date 7 days from a Date object', () => {
      const assignedDate = new Date('2024-01-01')
      const dueDate = calculateDueDate(assignedDate)
      const expectedDate = new Date('2024-01-08')
      expect(dueDate.getTime()).toBe(expectedDate.getTime())
    })

    it('should calculate due date 7 days from a string date', () => {
      const assignedDate = '2024-01-01'
      const dueDate = calculateDueDate(assignedDate)
      const expectedDate = new Date('2024-01-08')
      expect(dueDate.getTime()).toBe(expectedDate.getTime())
    })

    it('should handle leap year correctly', () => {
      const assignedDate = new Date('2024-02-24')
      const dueDate = calculateDueDate(assignedDate)
      const expectedDate = new Date('2024-03-02')
      expect(dueDate.getTime()).toBe(expectedDate.getTime())
    })
  })

  describe('formatDate', () => {
    it('should format Date object to yyyy-MM-dd', () => {
      const date = new Date('2024-01-15T10:30:00')
      expect(formatDate(date)).toBe('2024-01-15')
    })

    it('should format string date to yyyy-MM-dd', () => {
      const date = '2024-12-25'
      expect(formatDate(date)).toBe('2024-12-25')
    })

    it('should handle ISO string dates', () => {
      const date = '2024-06-30T00:00:00.000Z'
      expect(formatDate(date)).toBe('2024-06-30')
    })
  })

  describe('formatDateTime', () => {
    it('should format Date object to MMM dd, yyyy HH:mm', () => {
      const date = new Date('2024-01-15T14:30:00')
      const formatted = formatDateTime(date)
      expect(formatted).toMatch(/Jan 15, 2024 14:30/)
    })

    it('should format string date to MMM dd, yyyy HH:mm', () => {
      const date = '2024-12-25T09:15:00'
      const formatted = formatDateTime(date)
      expect(formatted).toMatch(/Dec 25, 2024 09:15/)
    })
  })

  describe('calculatePercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(calculatePercentage(75, 100)).toBe(75)
      expect(calculatePercentage(50, 100)).toBe(50)
      expect(calculatePercentage(1, 3)).toBe(33.33)
    })

    it('should return 0 when total is 0', () => {
      expect(calculatePercentage(10, 0)).toBe(0)
    })

    it('should round to 2 decimal places', () => {
      expect(calculatePercentage(1, 3)).toBe(33.33)
      expect(calculatePercentage(2, 3)).toBe(66.67)
    })

    it('should handle zero obtained marks', () => {
      expect(calculatePercentage(0, 100)).toBe(0)
    })

    it('should handle negative obtained marks', () => {
      expect(calculatePercentage(-10, 100)).toBe(-10)
    })
  })
})

