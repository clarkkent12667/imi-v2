import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/lib/__tests__/test-utils'
import DeleteClassButton from '../delete-class-button'
import userEvent from '@testing-library/user-event'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

// Mock fetch
global.fetch = vi.fn()

// Mock window.confirm
const mockConfirm = vi.fn(() => true)
window.confirm = mockConfirm

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('DeleteClassButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConfirm.mockReturnValue(true)
  })

  it('should render delete button', () => {
    render(<DeleteClassButton classId="class-1" />)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('should show confirmation dialog before deleting', async () => {
    render(<DeleteClassButton classId="class-1" />)
    const button = screen.getByRole('button')
    
    await userEvent.click(button)
    
    expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this class?')
  })

  it('should not delete if user cancels confirmation', async () => {
    mockConfirm.mockReturnValue(false)
    
    render(<DeleteClassButton classId="class-1" />)
    const button = screen.getByRole('button')
    
    await userEvent.click(button)
    
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should call delete API when confirmed', async () => {
    const { toast } = await import('sonner')
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response)

    render(<DeleteClassButton classId="class-1" />)
    const button = screen.getByRole('button')
    
    await userEvent.click(button)
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/classes/class-1', {
        method: 'DELETE',
      })
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Class deleted successfully')
    })
  })

  it('should show error toast when delete fails', async () => {
    const { toast } = await import('sonner')
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to delete class' }),
    } as Response)

    render(<DeleteClassButton classId="class-1" />)
    const button = screen.getByRole('button')
    
    await userEvent.click(button)
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to delete class')
    })
  })

  it('should be disabled while deleting', async () => {
    vi.mocked(global.fetch).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ ok: true, json: async () => ({}) } as Response), 100)
        )
    )

    render(<DeleteClassButton classId="class-1" />)
    const button = screen.getByRole('button')
    
    await userEvent.click(button)
    
    await waitFor(() => {
      expect(button).toBeDisabled()
    })
  })

  it('should handle network errors', async () => {
    const { toast } = await import('sonner')
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

    render(<DeleteClassButton classId="class-1" />)
    const button = screen.getByRole('button')
    
    await userEvent.click(button)
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })
  })
})

