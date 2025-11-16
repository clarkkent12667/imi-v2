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

describe('API /api/students', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient()
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
  })

  describe('GET', () => {
    it('should return students successfully', async () => {
      const mockStudents = [
        {
          id: 'student-1',
          full_name: 'John Doe',
          school_year_group: 'Year 10',
          year_group_id: 'year-1',
          created_at: '2024-01-01',
          year_groups: { id: 'year-1', name: 'Year 10' },
        },
      ]

      const mockOrder = vi.fn().mockResolvedValue(mockSupabaseResponse(mockStudents))
      mockSupabase._mockSelect.mockReturnValue({
        order: mockOrder,
      } as any)

      const response = await GET()
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data).toHaveLength(1)
      expect(data[0]).toHaveProperty('year_group_name', 'Year 10')
      expect(mockSupabase.from).toHaveBeenCalledWith('students')
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
    it('should create student successfully', async () => {
      const mockStudent = {
        id: 'student-1',
        full_name: 'John Doe',
        year_group_id: 'year-1',
        school_year_group: 'Year 10',
        created_by: 'admin-1',
      }

      const mockYearGroup = { name: 'Year 10' }

      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          fullName: 'John Doe',
          yearGroupId: 'year-1',
        }),
      } as any

      // Mock year group lookup
      const mockYearGroupSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSupabaseResponse(mockYearGroup)),
        }),
      })

      // Mock student insert
      mockSupabase._mockInsert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSupabaseResponse(mockStudent)),
        }),
      })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'year_groups') {
          return {
            select: mockYearGroupSelect,
          } as any
        }
        if (table === 'students') {
          return {
            insert: mockSupabase._mockInsert,
          } as any
        }
        return mockSupabase.from(table)
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(response.status).toBe(201)
      expect(data).toEqual(mockStudent)
    })

    it('should handle validation errors', async () => {
      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          fullName: '',
          yearGroupId: 'invalid-uuid',
        }),
      } as any

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should handle database errors', async () => {
      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          fullName: 'John Doe',
          yearGroupId: 'year-1',
        }),
      } as any

      const error = { message: 'Database error', code: 'PGRST_ERROR' }
      mockSupabase._mockInsert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSupabaseResponse(null, error)),
        }),
      })

      const mockYearGroupSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSupabaseResponse({ name: 'Year 10' })),
        }),
      })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'year_groups') {
          return {
            select: mockYearGroupSelect,
          } as any
        }
        if (table === 'students') {
          return {
            insert: mockSupabase._mockInsert,
          } as any
        }
        return mockSupabase.from(table)
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
      expect(data.error).toBe('Database error')
    })
  })
})

