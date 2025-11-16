import { describe, it, expect } from 'vitest'
import {
  signupSchema,
  loginSchema,
  studentSchema,
  teacherSchema,
  classSchema,
  scheduleSchema,
  workRecordSchema,
  qualificationSchema,
  examBoardSchema,
  subjectSchema,
  topicSchema,
  subtopicSchema,
} from '../validations'

describe('validations', () => {
  describe('signupSchema', () => {
    it('should validate correct signup data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'John Doe',
        role: 'admin' as const,
      }
      expect(() => signupSchema.parse(validData)).not.toThrow()
    })

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
        fullName: 'John Doe',
        role: 'admin' as const,
      }
      expect(() => signupSchema.parse(invalidData)).toThrow()
    })

    it('should reject short password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'short',
        fullName: 'John Doe',
        role: 'admin' as const,
      }
      expect(() => signupSchema.parse(invalidData)).toThrow()
    })

    it('should reject empty full name', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password123',
        fullName: '',
        role: 'admin' as const,
      }
      expect(() => signupSchema.parse(invalidData)).toThrow()
    })

    it('should reject invalid role', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'John Doe',
        role: 'invalid' as any,
      }
      expect(() => signupSchema.parse(invalidData)).toThrow()
    })
  })

  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      }
      expect(() => loginSchema.parse(validData)).not.toThrow()
    })

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
      }
      expect(() => loginSchema.parse(invalidData)).toThrow()
    })

    it('should reject empty password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '',
      }
      expect(() => loginSchema.parse(invalidData)).toThrow()
    })
  })

  describe('studentSchema', () => {
    it('should validate correct student data', () => {
      const validData = {
        fullName: 'John Doe',
        yearGroupId: '123e4567-e89b-12d3-a456-426614174000',
      }
      expect(() => studentSchema.parse(validData)).not.toThrow()
    })

    it('should reject invalid UUID', () => {
      const invalidData = {
        fullName: 'John Doe',
        yearGroupId: 'invalid-uuid',
      }
      expect(() => studentSchema.parse(invalidData)).toThrow()
    })

    it('should reject empty full name', () => {
      const invalidData = {
        fullName: '',
        yearGroupId: '123e4567-e89b-12d3-a456-426614174000',
      }
      expect(() => studentSchema.parse(invalidData)).toThrow()
    })
  })

  describe('teacherSchema', () => {
    it('should validate correct teacher data', () => {
      const validData = {
        email: 'teacher@example.com',
        fullName: 'Jane Smith',
      }
      expect(() => teacherSchema.parse(validData)).not.toThrow()
    })

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        fullName: 'Jane Smith',
      }
      expect(() => teacherSchema.parse(invalidData)).toThrow()
    })

    it('should reject empty full name', () => {
      const invalidData = {
        email: 'teacher@example.com',
        fullName: '',
      }
      expect(() => teacherSchema.parse(invalidData)).toThrow()
    })
  })

  describe('classSchema', () => {
    it('should validate correct class data', () => {
      const validData = {
        name: 'Mathematics Year 10',
        teacherId: '123e4567-e89b-12d3-a456-426614174000',
        studentIds: ['123e4567-e89b-12d3-a456-426614174001'],
        subjectId: '123e4567-e89b-12d3-a456-426614174002',
        yearGroupId: '123e4567-e89b-12d3-a456-426614174003',
      }
      expect(() => classSchema.parse(validData)).not.toThrow()
    })

    it('should validate class without optional yearGroupId', () => {
      const validData = {
        name: 'Mathematics Year 10',
        teacherId: '123e4567-e89b-12d3-a456-426614174000',
        studentIds: ['123e4567-e89b-12d3-a456-426614174001'],
        subjectId: '123e4567-e89b-12d3-a456-426614174002',
      }
      expect(() => classSchema.parse(validData)).not.toThrow()
    })

    it('should reject empty studentIds array', () => {
      const invalidData = {
        name: 'Mathematics Year 10',
        teacherId: '123e4567-e89b-12d3-a456-426614174000',
        studentIds: [],
        subjectId: '123e4567-e89b-12d3-a456-426614174002',
      }
      expect(() => classSchema.parse(invalidData)).toThrow()
    })

    it('should reject invalid UUIDs', () => {
      const invalidData = {
        name: 'Mathematics Year 10',
        teacherId: 'invalid-uuid',
        studentIds: ['123e4567-e89b-12d3-a456-426614174001'],
        subjectId: '123e4567-e89b-12d3-a456-426614174002',
      }
      expect(() => classSchema.parse(invalidData)).toThrow()
    })

    it('should reject empty class name', () => {
      const invalidData = {
        name: '',
        teacherId: '123e4567-e89b-12d3-a456-426614174000',
        studentIds: ['123e4567-e89b-12d3-a456-426614174001'],
        subjectId: '123e4567-e89b-12d3-a456-426614174002',
      }
      expect(() => classSchema.parse(invalidData)).toThrow()
    })
  })

  describe('scheduleSchema', () => {
    it('should validate correct schedule data', () => {
      const validData = {
        classId: '123e4567-e89b-12d3-a456-426614174000',
        schedules: [
          {
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '10:30',
          },
        ],
      }
      expect(() => scheduleSchema.parse(validData)).not.toThrow()
    })

    it('should reject invalid time format', () => {
      const invalidData = {
        classId: '123e4567-e89b-12d3-a456-426614174000',
        schedules: [
          {
            dayOfWeek: 1,
            startTime: '9:00',
            endTime: '10:30',
          },
        ],
      }
      expect(() => scheduleSchema.parse(invalidData)).toThrow()
    })

    it('should reject invalid dayOfWeek', () => {
      const invalidData = {
        classId: '123e4567-e89b-12d3-a456-426614174000',
        schedules: [
          {
            dayOfWeek: 7,
            startTime: '09:00',
            endTime: '10:30',
          },
        ],
      }
      expect(() => scheduleSchema.parse(invalidData)).toThrow()
    })

    it('should reject invalid UUID', () => {
      const invalidData = {
        classId: 'invalid-uuid',
        schedules: [
          {
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '10:30',
          },
        ],
      }
      expect(() => scheduleSchema.parse(invalidData)).toThrow()
    })
  })

  describe('workRecordSchema', () => {
    it('should validate correct work record data', () => {
      const validData = {
        classId: '123e4567-e89b-12d3-a456-426614174000',
        studentId: '123e4567-e89b-12d3-a456-426614174001',
        workType: 'homework' as const,
        workTitle: 'Algebra Assignment',
        qualificationId: '123e4567-e89b-12d3-a456-426614174002',
        examBoardId: '123e4567-e89b-12d3-a456-426614174003',
        subjectId: '123e4567-e89b-12d3-a456-426614174004',
        assignedDate: '2024-01-15',
        marksObtained: 75,
        totalMarks: 100,
      }
      expect(() => workRecordSchema.parse(validData)).not.toThrow()
    })

    it('should validate with optional topicId and subtopicId', () => {
      const validData = {
        classId: '123e4567-e89b-12d3-a456-426614174000',
        studentId: '123e4567-e89b-12d3-a456-426614174001',
        workType: 'classwork' as const,
        workTitle: 'Algebra Assignment',
        qualificationId: '123e4567-e89b-12d3-a456-426614174002',
        examBoardId: '123e4567-e89b-12d3-a456-426614174003',
        subjectId: '123e4567-e89b-12d3-a456-426614174004',
        topicId: '123e4567-e89b-12d3-a456-426614174005',
        subtopicId: '123e4567-e89b-12d3-a456-426614174006',
        assignedDate: '2024-01-15',
        marksObtained: 75,
        totalMarks: 100,
      }
      expect(() => workRecordSchema.parse(validData)).not.toThrow()
    })

    it('should reject negative marksObtained', () => {
      const invalidData = {
        classId: '123e4567-e89b-12d3-a456-426614174000',
        studentId: '123e4567-e89b-12d3-a456-426614174001',
        workType: 'homework' as const,
        workTitle: 'Algebra Assignment',
        qualificationId: '123e4567-e89b-12d3-a456-426614174002',
        examBoardId: '123e4567-e89b-12d3-a456-426614174003',
        subjectId: '123e4567-e89b-12d3-a456-426614174004',
        assignedDate: '2024-01-15',
        marksObtained: -10,
        totalMarks: 100,
      }
      expect(() => workRecordSchema.parse(invalidData)).toThrow()
    })

    it('should reject totalMarks less than 1', () => {
      const invalidData = {
        classId: '123e4567-e89b-12d3-a456-426614174000',
        studentId: '123e4567-e89b-12d3-a456-426614174001',
        workType: 'homework' as const,
        workTitle: 'Algebra Assignment',
        qualificationId: '123e4567-e89b-12d3-a456-426614174002',
        examBoardId: '123e4567-e89b-12d3-a456-426614174003',
        subjectId: '123e4567-e89b-12d3-a456-426614174004',
        assignedDate: '2024-01-15',
        marksObtained: 75,
        totalMarks: 0,
      }
      expect(() => workRecordSchema.parse(invalidData)).toThrow()
    })
  })

  describe('taxonomy schemas', () => {
    it('should validate qualificationSchema', () => {
      const validData = { name: 'GCSE' }
      expect(() => qualificationSchema.parse(validData)).not.toThrow()
      expect(() => qualificationSchema.parse({ name: '' })).toThrow()
    })

    it('should validate examBoardSchema', () => {
      const validData = {
        name: 'AQA',
        qualificationId: '123e4567-e89b-12d3-a456-426614174000',
      }
      expect(() => examBoardSchema.parse(validData)).not.toThrow()
      expect(() => examBoardSchema.parse({ name: 'AQA', qualificationId: 'invalid' })).toThrow()
    })

    it('should validate subjectSchema', () => {
      const validData = {
        name: 'Mathematics',
        examBoardId: '123e4567-e89b-12d3-a456-426614174000',
      }
      expect(() => subjectSchema.parse(validData)).not.toThrow()
    })

    it('should validate topicSchema', () => {
      const validData = {
        name: 'Algebra',
        subjectId: '123e4567-e89b-12d3-a456-426614174000',
      }
      expect(() => topicSchema.parse(validData)).not.toThrow()
    })

    it('should validate subtopicSchema', () => {
      const validData = {
        name: 'Linear Equations',
        topicId: '123e4567-e89b-12d3-a456-426614174000',
      }
      expect(() => subtopicSchema.parse(validData)).not.toThrow()
    })
  })
})

