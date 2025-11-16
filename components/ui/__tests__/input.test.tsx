import { describe, it, expect } from 'vitest'
import { render, screen } from '@/lib/__tests__/test-utils'
import { Input } from '../input'
import userEvent from '@testing-library/user-event'

describe('Input', () => {
  it('should render input element', () => {
    render(<Input placeholder="Enter text" />)
    const input = screen.getByPlaceholderText('Enter text')
    expect(input).toBeInTheDocument()
    expect(input.tagName).toBe('INPUT')
  })

  it('should handle text input', async () => {
    render(<Input placeholder="Enter text" />)
    const input = screen.getByPlaceholderText('Enter text') as HTMLInputElement
    
    await userEvent.type(input, 'Hello World')
    expect(input.value).toBe('Hello World')
  })

  it('should support different input types', () => {
    const { rerender } = render(<Input type="email" placeholder="Email" />)
    let input = screen.getByPlaceholderText('Email')
    expect(input).toHaveAttribute('type', 'email')

    rerender(<Input type="password" placeholder="Password" />)
    input = screen.getByPlaceholderText('Password')
    expect(input).toHaveAttribute('type', 'password')

    rerender(<Input type="number" placeholder="Number" />)
    input = screen.getByPlaceholderText('Number')
    expect(input).toHaveAttribute('type', 'number')
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Input disabled placeholder="Disabled" />)
    const input = screen.getByPlaceholderText('Disabled')
    expect(input).toBeDisabled()
  })

  it('should accept custom className', () => {
    render(<Input className="custom-class" placeholder="Custom" />)
    const input = screen.getByPlaceholderText('Custom')
    expect(input).toHaveClass('custom-class')
  })

  it('should handle onChange events', async () => {
    const handleChange = vi.fn()
    render(<Input onChange={handleChange} placeholder="Test" />)
    const input = screen.getByPlaceholderText('Test')
    
    await userEvent.type(input, 'test')
    expect(handleChange).toHaveBeenCalled()
  })

  it('should support aria-invalid attribute', () => {
    render(<Input aria-invalid="true" placeholder="Invalid" />)
    const input = screen.getByPlaceholderText('Invalid')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('should support value prop', () => {
    render(<Input value="Initial value" onChange={() => {}} placeholder="Test" />)
    const input = screen.getByPlaceholderText('Test') as HTMLInputElement
    expect(input.value).toBe('Initial value')
  })
})

