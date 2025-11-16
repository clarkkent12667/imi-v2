import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '../route'
import { createMockSupabaseClient, mockSupabaseResponse } from '@/lib/__tests__/mocks/supabase'
import { mockRequireAuth } from '@/lib/__tests__/mocks/auth'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  requireAuth: mockRequireAuth,
}))

vi.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    constructor(public url: string) {}
    json = vi.fn()
  },
  NextResponse: {
    json: vi.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
      ok: (init?.status || 200) < 400,
    })),
  },
}))

import { createClient } from '@/lib/supabase/server'

describe('API /api/classes', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient()
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
  })

  describe('GET', () => {
    it('should return classes successfully', async () => {
      const mockClasses = [
        {
          id: 'class-1',
          name: 'Mathematics Year 10',
          teacher_id: 'teacher-1',
          created_by: 'admin-1',
          created_at: '2024-01-01',
          subject_id: 'subject-1',
          year_group_id: 'year-1',
          users: { id: 'teacher-1', full_name: 'John Doe', email: 'john@example.com' },
          subjects: { id: 'subject-1', name: 'Mathematics' },
          year_groups: { id: 'year-1', name: 'Year 10' },
        },
      ]

      const mockOrder = vi.fn().mockResolvedValue(mockSupabaseResponse(mockClasses))
      mockSupabase._mockSelect.mockReturnValue({
        order: mockOrder,
      } as any)

      const response = await GET()
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data).toEqual(mockClasses)
      expect(mockSupabase.from).toHaveBeenCalledWith('classes')
    })

    it('should handle database errors', async () => {
      const error = { message: 'Database error', code: 'PGRST_ERROR' }
      const mockOrder = vi.fn().mockResolvedValue(mockSupabaseResponse(null, error))
      mockSupabase._mockSelect.mockReturnValue({
        order: mockOrder,
      } as any)

      const response = await GET()
      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(500)
      expect(data.error).toBe('Database error')
    })
  })

  describe('POST', () => {
    it('should create class successfully', async () => {
      const mockClass = {
        id: 'class-1',
        name: 'Mathematics Year 10',
        teacher_id: 'teacher-1',
        created_by: 'admin-1',
        subject_id: 'subject-1',
        year_group_id: 'year-1',
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          name: 'Mathematics Year 10',
          teacherId: 'teacher-1',
          studentIds: ['student-1', 'student-2'],
          subjectId: 'subject-1',
          yearGroupId: 'year-1',
        }),
      } as any

      // Mock class insert
      mockSupabase._mockInsert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSupabaseResponse(mockClass)),
        }),
      })

      // Mock class_students insert
      const mockInsertStudents = vi.fn().mockResolvedValue(mockSupabaseResponse(null))
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'classes') {
          return {
            insert: mockSupabase._mockInsert,
          } as any
        }
        if (table === 'class_students') {
          return {
            insert: mockInsertStudents,
          } as any
        }
        return mockSupabase.from(table)
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(response.status).toBe(201)
      expect(data).toEqual(mockClass)
      expect(mockInsertStudents).toHaveBeenCalledWith([
        { class_id: 'class-1', student_id: 'student-1' },
        { class_id: 'class-1', student_id: 'student-2' },
      ])
    })

    it('should handle validation errors', async () => {
      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          name: '',
          teacherId: 'invalid-uuid',
          studentIds: [],
        }),
      } as any

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should handle database errors during class creation', async () => {
      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          name: 'Mathematics Year 10',
          teacherId: 'teacher-1',
          studentIds: ['student-1'],
          subjectId: 'subject-1',
        }),
      } as any

      const error = { message: 'Database error', code: 'PGRST_ERROR' }
      mockSupabase._mockInsert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSupabaseResponse(null, error)),
        }),
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
      expect(data.error).toBe('Database error')
    })

    it('should handle errors when adding students', async () => {
      const mockClass = {
        id: 'class-1',
        name: 'Mathematics Year 10',
        teacher_id: 'teacher-1',
        created_by: 'admin-1',
        subject_id: 'subject-1',
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          name: 'Mathematics Year 10',
          teacherId: 'teacher-1',
          studentIds: ['student-1'],
          subjectId: 'subject-1',
        }),
      } as any

      mockSupabase._mockInsert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSupabaseResponse(mockClass)),
        }),
      })

      const error = { message: 'Failed to add students', code: 'PGRST_ERROR' }
      const mockInsertStudents = vi.fn().mockResolvedValue(mockSupabaseResponse(null, error))
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'classes') {
          return {
            insert: mockSupabase._mockInsert,
          } as any
        }
        if (table === 'class_students') {
          return {
            insert: mockInsertStudents,
          } as any
        }
        return mockSupabase.from(table)
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
      expect(data.error).toBe('Failed to add students')
    })
  })
})

