import { describe, it, expect, jest } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/app/components/ui/Input'

describe('Input Component', () => {
  it('should render with basic props', () => {
    render(<Input placeholder="Enter text" />)
    
    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('placeholder', 'Enter text')
  })

  it('should render with label', () => {
    render(<Input label="Username" />)
    
    const label = screen.getByText('Username')
    const input = screen.getByRole('textbox')
    
    expect(label).toBeInTheDocument()
    expect(input).toHaveAccessibleName('Username')
  })

  it('should render with required indicator', () => {
    render(<Input label="Email" required />)
    
    const requiredIndicator = screen.getByLabelText(/campo obligatorio/i)
    expect(requiredIndicator).toBeInTheDocument()
    expect(requiredIndicator).toHaveTextContent('*')
  })

  it('should render with helper text', () => {
    render(<Input label="Password" helperText="Must be at least 8 characters" />)
    
    const helperText = screen.getByText('Must be at least 8 characters')
    expect(helperText).toBeInTheDocument()
    expect(helperText).toHaveClass('help-text')
  })

  it('should render with error message', () => {
    render(<Input label="Email" error="Email is required" />)
    
    const input = screen.getByRole('textbox')
    const errorMessage = screen.getByText('Email is required')
    
    expect(errorMessage).toBeInTheDocument()
    expect(errorMessage).toHaveAttribute('role', 'alert')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveClass('form-input--error')
  })

  it('should hide helper text when error is present', () => {
    render(
      <Input 
        label="Email" 
        helperText="Enter your email address" 
        error="Email is required" 
      />
    )
    
    expect(screen.getByText('Email is required')).toBeInTheDocument()
    expect(screen.queryByText('Enter your email address')).not.toBeInTheDocument()
  })

  it('should handle focus and blur events', async () => {
    const user = userEvent.setup()
    render(<Input label="Test Input" />)
    
    const input = screen.getByRole('textbox')
    
    await user.click(input)
    expect(input).toHaveClass('form-input--focused')
    
    await user.tab() // Move focus away
    expect(input).not.toHaveClass('form-input--focused')
  })

  it('should forward custom onFocus and onBlur handlers', () => {
    const onFocus = jest.fn()
    const onBlur = jest.fn()
    
    render(<Input onFocus={onFocus} onBlur={onBlur} />)
    
    const input = screen.getByRole('textbox')
    
    fireEvent.focus(input)
    expect(onFocus).toHaveBeenCalledTimes(1)
    
    fireEvent.blur(input)
    expect(onBlur).toHaveBeenCalledTimes(1)
  })

  describe('Password Input', () => {
    it('should render password input with toggle', () => {
      render(<Input type="password" showPasswordToggle />)
      
      const input = screen.getByDisplayValue('')
      const toggleButton = screen.getByRole('button', { name: /mostrar contraseña/i })
      
      expect(input).toHaveAttribute('type', 'password')
      expect(toggleButton).toBeInTheDocument()
    })

    it('should toggle password visibility', async () => {
      const user = userEvent.setup()
      render(<Input type="password" showPasswordToggle />)
      
      const input = screen.getByDisplayValue('')
      const toggleButton = screen.getByRole('button', { name: /mostrar contraseña/i })
      
      expect(input).toHaveAttribute('type', 'password')
      
      await user.click(toggleButton)
      expect(input).toHaveAttribute('type', 'text')
      expect(screen.getByRole('button', { name: /ocultar contraseña/i })).toBeInTheDocument()
      
      await user.click(toggleButton)
      expect(input).toHaveAttribute('type', 'password')
    })

    it('should have proper aria attributes for password toggle', () => {
      render(<Input type="password" showPasswordToggle />)
      
      const toggleButton = screen.getByRole('button', { name: /mostrar contraseña/i })
      
      expect(toggleButton).toHaveAttribute('aria-pressed', 'false')
      expect(toggleButton).toHaveAttribute('tabIndex', '-1')
    })

    it('should not show toggle for non-password inputs', () => {
      render(<Input type="text" showPasswordToggle />)
      
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should generate unique IDs for inputs', () => {
      render(
        <div>
          <Input label="First Input" />
          <Input label="Second Input" />
        </div>
      )
      
      const inputs = screen.getAllByRole('textbox')
      expect(inputs[0]).toHaveAttribute('id')
      expect(inputs[1]).toHaveAttribute('id')
      expect(inputs[0].getAttribute('id')).not.toBe(inputs[1].getAttribute('id'))
    })

    it('should use custom ID when provided', () => {
      render(<Input id="custom-input" label="Custom Input" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('id', 'custom-input')
    })

    it('should associate label with input', () => {
      render(<Input id="test-input" label="Test Label" />)
      
      const label = screen.getByText('Test Label')
      const input = screen.getByRole('textbox')
      
      expect(label).toHaveAttribute('for', 'test-input')
      expect(input).toHaveAttribute('id', 'test-input')
    })

    it('should associate error message with input', () => {
      render(<Input id="test-input" error="Error message" />)
      
      const input = screen.getByRole('textbox')
      const errorMessage = screen.getByText('Error message')
      
      expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('test-input-error'))
      expect(errorMessage).toHaveAttribute('id', expect.stringContaining('test-input-error'))
    })

    it('should associate helper text with input', () => {
      render(<Input id="test-input" helperText="Helper text" />)
      
      const input = screen.getByRole('textbox')
      const helperText = screen.getByText('Helper text')
      
      expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('test-input-helper'))
      expect(helperText).toHaveAttribute('id', expect.stringContaining('test-input-helper'))
    })

    it('should associate both error and helper text with input when both present', () => {
      render(<Input id="test-input" helperText="Helper text" error="Error message" />)
      
      const input = screen.getByRole('textbox')
      const describedBy = input.getAttribute('aria-describedby')
      
      expect(describedBy).toContain('test-input-error')
      // Helper text should not be present when error exists
      expect(screen.queryByText('Helper text')).not.toBeInTheDocument()
    })
  })

  describe('Form Integration', () => {
    it('should accept all standard input props', () => {
      render(
        <Input
          name="test-input"
          placeholder="Test placeholder"
          defaultValue="Default value"
          maxLength={10}
          autoComplete="email"
          disabled
        />
      )
      
      const input = screen.getByRole('textbox')
      
      expect(input).toHaveAttribute('name', 'test-input')
      expect(input).toHaveAttribute('placeholder', 'Test placeholder')
      expect(input).toHaveAttribute('maxlength', '10')
      expect(input).toHaveAttribute('autocomplete', 'email')
      expect(input).toBeDisabled()
    })

    it('should forward ref correctly', () => {
      const ref = { current: null }
      render(<Input ref={ref} />)
      
      expect(ref.current).toBeInstanceOf(HTMLInputElement)
    })

    it('should accept custom className', () => {
      render(<Input className="custom-input-class" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('custom-input-class')
    })
  })
})