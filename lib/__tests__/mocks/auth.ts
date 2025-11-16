import { vi } from 'vitest'

export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'admin' as const,
  fullName: 'Test User',
}

export const mockRequireAuth = vi.fn(async (role?: 'admin' | 'teacher') => {
  if (role && mockUser.role !== role) {
    throw new Error('Unauthorized')
  }
  return mockUser
})

export const mockGetCurrentUser = vi.fn(async () => mockUser)

