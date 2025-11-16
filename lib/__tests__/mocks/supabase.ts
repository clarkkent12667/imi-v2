import { vi } from 'vitest'

export const createMockSupabaseClient = () => {
  const mockSelect = vi.fn().mockReturnThis()
  const mockInsert = vi.fn().mockReturnThis()
  const mockUpdate = vi.fn().mockReturnThis()
  const mockDelete = vi.fn().mockReturnThis()
  const mockEq = vi.fn().mockReturnThis()
  const mockSingle = vi.fn().mockReturnThis()
  const mockOrder = vi.fn().mockReturnThis()

  const mockFrom = vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  }))

  const mockAuth = {
    getUser: vi.fn(),
    admin: {
      createUser: vi.fn(),
    },
  }

  return {
    from: mockFrom,
    auth: mockAuth,
    _mockSelect: mockSelect,
    _mockInsert: mockInsert,
    _mockUpdate: mockUpdate,
    _mockDelete: mockDelete,
    _mockEq: mockEq,
    _mockSingle: mockSingle,
    _mockOrder: mockOrder,
  }
}

export const mockSupabaseResponse = <T>(data: T | null, error: any = null) => ({
  data,
  error,
})

