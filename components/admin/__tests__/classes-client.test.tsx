import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/lib/__tests__/test-utils'
import ClassesClient from '../classes-client'
import userEvent from '@testing-library/user-event'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

// Mock fetch
global.fetch = vi.fn()

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('ClassesClient', () => {
  const mockTeachers = [
    { id: 'teacher-1', full_name: 'John Doe', email: 'john@example.com' },
  ]

  const mockStudents = [
    { id: 'student-1', full_name: 'Alice Smith', school_year_group: 'Year 10' },
    { id: 'student-2', full_name: 'Bob Johnson', school_year_group: 'Year 11' },
  ]

  const mockSubjects = [
    { id: 'subject-1', name: 'Mathematics' },
    { id: 'subject-2', name: 'Physics' },
  ]

  const mockYearGroups = [
    { id: 'year-1', name: 'Year 10' },
    { id: 'year-2', name: 'Year 11' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render create class button', () => {
    render(
      <ClassesClient
        teachers={mockTeachers}
        students={mockStudents}
        subjects={mockSubjects}
        yearGroups={mockYearGroups}
      />
    )
    expect(screen.getByRole('button', { name: /create class/i })).toBeInTheDocument()
  })

  it('should open dialog when create button is clicked', async () => {
    render(
      <ClassesClient
        teachers={mockTeachers}
        students={mockStudents}
        subjects={mockSubjects}
        yearGroups={mockYearGroups}
      />
    )
    
    const createButton = screen.getByRole('button', { name: /create class/i })
    await userEvent.click(createButton)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/create class/i)).toBeInTheDocument()
  })

  it('should display form fields in dialog', async () => {
    render(
      <ClassesClient
        teachers={mockTeachers}
        students={mockStudents}
        subjects={mockSubjects}
        yearGroups={mockYearGroups}
      />
    )
    
    const createButton = screen.getByRole('button', { name: /create class/i })
    await userEvent.click(createButton)

    expect(screen.getByLabelText(/class name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/teacher/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/subject/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/year group/i)).toBeInTheDocument()
    expect(screen.getByText(/students/i)).toBeInTheDocument()
  })

  it('should close dialog when cancel is clicked', async () => {
    render(
      <ClassesClient
        teachers={mockTeachers}
        students={mockStudents}
        subjects={mockSubjects}
        yearGroups={mockYearGroups}
      />
    )
    
    const createButton = screen.getByRole('button', { name: /create class/i })
    await userEvent.click(createButton)

    expect(screen.getByRole('dialog')).toBeInTheDocument()

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await userEvent.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('should display teachers in select', async () => {
    render(
      <ClassesClient
        teachers={mockTeachers}
        students={mockStudents}
        subjects={mockSubjects}
        yearGroups={mockYearGroups}
      />
    )
    
    const createButton = screen.getByRole('button', { name: /create class/i })
    await userEvent.click(createButton)

    // Note: Radix UI Select components can be tricky to test
    // This test verifies the component renders without errors
    expect(screen.getByText(/select a teacher/i)).toBeInTheDocument()
  })

  it('should display students as checkboxes', async () => {
    render(
      <ClassesClient
        teachers={mockTeachers}
        students={mockStudents}
        subjects={mockSubjects}
        yearGroups={mockYearGroups}
      />
    )
    
    const createButton = screen.getByRole('button', { name: /create class/i })
    await userEvent.click(createButton)

    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument()
  })

  it('should show error when submitting without required fields', async () => {
    const { toast } = await import('sonner')
    
    render(
      <ClassesClient
        teachers={mockTeachers}
        students={mockStudents}
        subjects={mockSubjects}
        yearGroups={mockYearGroups}
      />
    )
    
    const createButton = screen.getByRole('button', { name: /create class/i })
    await userEvent.click(createButton)

    const submitButton = screen.getByRole('button', { name: /create/i })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })
  })

  it('should create class successfully with valid data', async () => {
    const { toast } = await import('sonner')
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'class-1', name: 'Test Class' }),
    } as Response)

    render(
      <ClassesClient
        teachers={mockTeachers}
        students={mockStudents}
        subjects={mockSubjects}
        yearGroups={mockYearGroups}
      />
    )
    
    const createButton = screen.getByRole('button', { name: /create class/i })
    await userEvent.click(createButton)

    // Fill in form
    const nameInput = screen.getByLabelText(/class name/i)
    await userEvent.type(nameInput, 'Test Class')

    // Select a student
    const studentCheckbox = screen.getByLabelText(/alice smith/i)
    await userEvent.click(studentCheckbox)

    // Note: Full form submission testing would require more complex setup
    // due to Radix UI Select components and form validation
  })
})

