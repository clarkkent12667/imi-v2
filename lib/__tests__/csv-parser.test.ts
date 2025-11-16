import { describe, it, expect } from 'vitest'
import {
  parseCSV,
  validateCSVData,
  parseTeacherCSV,
  validateTeacherCSVData,
  parseStudentCSV,
  validateStudentCSVData,
  type TaxonomyCSVRow,
  type TeacherCSVRow,
  type StudentCSVRow,
} from '../csv-parser'

describe('csv-parser', () => {
  describe('parseCSV (Taxonomy)', () => {
    it('should parse valid CSV with required columns', () => {
      const csv = `Qualification,Exam Board,Subject
GCSE,AQA,Mathematics
A-Level,OCR,Physics`
      const result = parseCSV(csv)
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        Qualification: 'GCSE',
        'Exam Board': 'AQA',
        Subject: 'Mathematics',
      })
    })

    it('should parse CSV with optional Topic and Subtopic columns', () => {
      const csv = `Qualification,Exam Board,Subject,Topic,Subtopic
GCSE,AQA,Mathematics,Algebra,Linear Equations`
      const result = parseCSV(csv)
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        Qualification: 'GCSE',
        'Exam Board': 'AQA',
        Subject: 'Mathematics',
        Topic: 'Algebra',
        Subtopic: 'Linear Equations',
      })
    })

    it('should handle case-insensitive headers', () => {
      const csv = `qualification,exam board,subject
GCSE,AQA,Mathematics`
      const result = parseCSV(csv)
      expect(result).toHaveLength(1)
    })

    it('should filter out rows with missing required fields', () => {
      const csv = `Qualification,Exam Board,Subject
GCSE,AQA,Mathematics
,OCR,Physics
A-Level,,Chemistry`
      const result = parseCSV(csv)
      expect(result).toHaveLength(1)
      expect(result[0].Qualification).toBe('GCSE')
    })

    it('should throw error for missing required headers', () => {
      const csv = `Qualification,Subject
GCSE,Mathematics`
      expect(() => parseCSV(csv)).toThrow('CSV must contain columns: Qualification, Exam Board, Subject')
    })

    it('should return empty array for empty CSV', () => {
      expect(parseCSV('')).toEqual([])
    })

    it('should handle extra whitespace', () => {
      const csv = `Qualification, Exam Board , Subject
  GCSE  ,  AQA  ,  Mathematics  `
      const result = parseCSV(csv)
      expect(result).toHaveLength(1)
      expect(result[0].Qualification).toBe('GCSE')
    })
  })

  describe('validateCSVData (Taxonomy)', () => {
    it('should validate correct data', () => {
      const rows: TaxonomyCSVRow[] = [
        {
          Qualification: 'GCSE',
          'Exam Board': 'AQA',
          Subject: 'Mathematics',
        },
      ]
      const result = validateCSVData(rows)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should return errors for empty rows', () => {
      const rows: TaxonomyCSVRow[] = []
      const result = validateCSVData(rows)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('CSV file is empty or contains no valid data')
    })

    it('should return errors for missing required fields', () => {
      const rows: TaxonomyCSVRow[] = [
        {
          Qualification: '',
          'Exam Board': 'AQA',
          Subject: 'Mathematics',
        },
        {
          Qualification: 'GCSE',
          'Exam Board': '',
          Subject: 'Mathematics',
        },
      ]
      const result = validateCSVData(rows)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('parseTeacherCSV', () => {
    it('should parse valid teacher CSV', () => {
      const csv = `Email,Full Name
teacher1@example.com,John Doe
teacher2@example.com,Jane Smith`
      const result = parseTeacherCSV(csv)
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        email: 'teacher1@example.com',
        full_name: 'John Doe',
      })
    })

    it('should handle different header variations', () => {
      const csv = `Email,Name
teacher@example.com,John Doe`
      const result = parseTeacherCSV(csv)
      expect(result).toHaveLength(1)
    })

    it('should remove quotes from values', () => {
      const csv = `Email,Full Name
"teacher@example.com","John Doe"`
      const result = parseTeacherCSV(csv)
      expect(result[0].email).toBe('teacher@example.com')
      expect(result[0].full_name).toBe('John Doe')
    })

    it('should throw error for missing required columns', () => {
      const csv = `Email
teacher@example.com`
      expect(() => parseTeacherCSV(csv)).toThrow('CSV must contain columns: Email, Full Name (or Name)')
    })

    it('should filter out rows with missing email or name', () => {
      const csv = `Email,Full Name
teacher@example.com,John Doe
,Missing Email
missing@example.com,`
      const result = parseTeacherCSV(csv)
      expect(result).toHaveLength(1)
    })
  })

  describe('validateTeacherCSVData', () => {
    it('should validate correct teacher data', () => {
      const rows: TeacherCSVRow[] = [
        { email: 'teacher1@example.com', full_name: 'John Doe' },
        { email: 'teacher2@example.com', full_name: 'Jane Smith' },
      ]
      const result = validateTeacherCSVData(rows)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect duplicate emails', () => {
      const rows: TeacherCSVRow[] = [
        { email: 'teacher@example.com', full_name: 'John Doe' },
        { email: 'teacher@example.com', full_name: 'Jane Smith' },
      ]
      const result = validateTeacherCSVData(rows)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('Duplicate email'))).toBe(true)
    })

    it('should detect invalid email formats', () => {
      const rows: TeacherCSVRow[] = [
        { email: 'invalid-email', full_name: 'John Doe' },
      ]
      const result = validateTeacherCSVData(rows)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('Invalid email format'))).toBe(true)
    })

    it('should detect missing required fields', () => {
      const rows: TeacherCSVRow[] = [
        { email: '', full_name: 'John Doe' },
        { email: 'teacher@example.com', full_name: '' },
      ]
      const result = validateTeacherCSVData(rows)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('parseStudentCSV', () => {
    it('should parse valid student CSV', () => {
      const csv = `Full Name,Year Group
John Doe,Year 10
Jane Smith,Year 11`
      const result = parseStudentCSV(csv)
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        full_name: 'John Doe',
        year_group: 'Year 10',
      })
    })

    it('should handle different header variations', () => {
      const csv = `Name,Year
John Doe,Year 10`
      const result = parseStudentCSV(csv)
      expect(result).toHaveLength(1)
    })

    it('should throw error for missing required columns', () => {
      const csv = `Full Name
John Doe`
      expect(() => parseStudentCSV(csv)).toThrow('CSV must contain columns: Full Name (or Name), Year Group (or Year)')
    })

    it('should filter out rows with missing data', () => {
      const csv = `Full Name,Year Group
John Doe,Year 10
,Year 11
Jane Smith,`
      const result = parseStudentCSV(csv)
      expect(result).toHaveLength(1)
    })
  })

  describe('validateStudentCSVData', () => {
    it('should validate correct student data', () => {
      const rows: StudentCSVRow[] = [
        { full_name: 'John Doe', year_group: 'Year 10' },
        { full_name: 'Jane Smith', year_group: 'Year 11' },
      ]
      const result = validateStudentCSVData(rows)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing required fields', () => {
      const rows: StudentCSVRow[] = [
        { full_name: '', year_group: 'Year 10' },
        { full_name: 'Jane Smith', year_group: '' },
      ]
      const result = validateStudentCSVData(rows)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should return error for empty rows', () => {
      const rows: StudentCSVRow[] = []
      const result = validateStudentCSVData(rows)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('CSV file is empty or contains no valid data')
    })
  })
})

