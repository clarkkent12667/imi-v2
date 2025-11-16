import { z } from 'zod'

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(1, 'Full name is required'),
  role: z.enum(['admin', 'teacher']),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const studentSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  yearGroupId: z.string().uuid('Invalid year group ID'),
  parentName: z.string().optional(),
  parentEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  parentPhone: z.string().optional(),
})

export const teacherSchema = z.object({
  email: z.string().email('Invalid email address'),
  fullName: z.string().min(1, 'Full name is required'),
})

export const classSchema = z.object({
  name: z.string().min(1, 'Class name is required'),
  teacherId: z.string().uuid('Invalid teacher ID'),
  studentIds: z.array(z.string().uuid()).min(1, 'At least one student is required'),
  subjectId: z.string().uuid('Invalid subject ID'),
  yearGroupId: z.string().uuid('Invalid year group ID').optional(),
})

export const scheduleSchema = z.object({
  classId: z.string().uuid('Invalid class ID'),
  schedules: z.array(
    z.object({
      dayOfWeek: z.number().min(0).max(6),
      startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
      endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    })
  ),
})

export const workRecordSchema = z.object({
  classId: z.string().uuid('Invalid class ID'),
  studentId: z.string().uuid('Invalid student ID'),
  workType: z.enum(['homework', 'classwork', 'past_paper']),
  workTitle: z
    .preprocess(
      (val) => (val === '' || val === null || val === undefined ? undefined : val),
      z.string().min(1, 'Work title must not be empty').optional()
    )
    .optional(),
  qualificationId: z.string().uuid('Invalid qualification ID'),
  examBoardId: z.string().uuid('Invalid exam board ID'),
  subjectId: z.string().uuid('Invalid subject ID'),
  topicId: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : val),
    z.string().uuid('Invalid topic ID').optional()
  ),
  subtopicId: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : val),
    z.string().uuid('Invalid subtopic ID').optional()
  ),
  assignedDate: z.string().date('Invalid date'),
  marksObtained: z.number().min(0, 'Marks cannot be negative'),
  totalMarks: z.number().min(1, 'Total marks must be at least 1'),
  status: z.enum(['not_submitted', 'submitted', 'resit', 're_assigned']).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
}).refine((data) => {
  // For past_paper, topic and subtopic are not required
  // For homework/classwork, topic/subtopic are optional but can be provided
  return true
})

export const taxonomyItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
})

export const qualificationSchema = taxonomyItemSchema
export const examBoardSchema = taxonomyItemSchema.extend({
  qualificationId: z.string().uuid('Invalid qualification ID'),
})
export const subjectSchema = taxonomyItemSchema.extend({
  examBoardId: z.string().uuid('Invalid exam board ID'),
})
export const topicSchema = taxonomyItemSchema.extend({
  subjectId: z.string().uuid('Invalid subject ID'),
})
export const subtopicSchema = taxonomyItemSchema.extend({
  topicId: z.string().uuid('Invalid topic ID'),
})

