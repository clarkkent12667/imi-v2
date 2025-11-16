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

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
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
import { createClient as createAdminClient } from '@supabase/supabase-js'

describe('API /api/users', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let mockAdminClient: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient()
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

    mockAdminClient = {
      auth: {
        admin: {
          createUser: vi.fn(),
        },
      },
    }
    vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as any)

    // Set environment variables
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  })

  describe('GET', () => {
    it('should return teachers successfully', async () => {
      const mockTeachers = [
        {
          id: 'teacher-1',
          email: 'teacher@example.com',
          full_name: 'John Doe',
          role: 'teacher',
          created_at: '2024-01-01',
        },
      ]

      const mockOrder = vi.fn().mockResolvedValue(mockSupabaseResponse(mockTeachers))
      const mockEq = vi.fn().mockReturnValue({
        order: mockOrder,
      })
      mockSupabase._mockSelect.mockReturnValue({
        eq: mockEq,
      } as any)

      const response = await GET()
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data).toEqual(mockTeachers)
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
    })

    it('should handle database errors', async () => {
      const error = { message: 'Database error', code: 'PGRST_ERROR' }
      const mockOrder = vi.fn().mockResolvedValue(mockSupabaseResponse(null, error))
      const mockEq = vi.fn().mockReturnValue({
        order: mockOrder,
      })
      mockSupabase._mockSelect.mockReturnValue({
        eq: mockEq,
      } as any)

      const response = await GET()
      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(500)
      expect(data.error).toBe('Database error')
    })
  })

  describe('POST', () => {
    it('should create teacher successfully', async () => {
      const mockAuthData = {
        user: {
          id: 'teacher-1',
          email: 'teacher@example.com',
        },
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          email: 'teacher@example.com',
          fullName: 'John Doe',
        }),
      } as any

      mockAdminClient.auth.admin.createUser.mockResolvedValue({
        data: mockAuthData,
        error: null,
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(response.status).toBe(201)
      expect(data.id).toBe('teacher-1')
      expect(data.email).toBe('teacher@example.com')
      expect(data.full_name).toBe('John Doe')
      expect(data.role).toBe('teacher')
      expect(mockAdminClient.auth.admin.createUser).toHaveBeenCalledWith({
        email: 'teacher@example.com',
        password: '12345678',
        email_confirm: true,
        user_metadata: {
          full_name: 'John Doe',
          role: 'teacher',
        },
      })
    })

    it('should handle validation errors', async () => {
      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          email: 'invalid-email',
          fullName: '',
        }),
      } as any

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should handle missing service role key', async () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY

      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          email: 'teacher@example.com',
          fullName: 'John Doe',
        }),
      } as any

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(500)
      expect(data.error).toContain('Service role key not configured')
    })

    it('should handle auth errors', async () => {
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          email: 'teacher@example.com',
          fullName: 'John Doe',
        }),
      } as any

      const error = { message: 'User already exists', code: 'USER_EXISTS' }
      mockAdminClient.auth.admin.createUser.mockResolvedValue({
        data: null,
        error,
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
      expect(data.error).toBe('User already exists')
    })
  })
})

