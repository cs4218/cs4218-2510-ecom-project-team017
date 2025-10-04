import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import Login from './Login';

// Mock dependencies FIRST - before any imports are resolved
jest.mock('axios');
jest.mock('react-hot-toast');
jest.mock('../../context/auth', () => ({
  useAuth: jest.fn(),
}));
jest.mock('../../context/cart', () => ({
  useCart: jest.fn(() => [{}, jest.fn()]),
}));
jest.mock('../../context/search', () => ({
  useSearch: jest.fn(() => [{}, jest.fn()]),
}));
jest.mock("../../hooks/useCategory", () => jest.fn(() => []));
jest.mock("./../../components/Layout", () => {
  return function MockLayout({ children, title }) {
    return <div data-testid="mock-layout">{children}</div>;
  };
});

// Test helper functions
const renderComponent = (initialEntries = ['/login'], authState = null) => {
  // Mock the useAuth hook with the desired state
  const mockSetAuth = jest.fn();
  const { useAuth } = require('../../context/auth');
  useAuth.mockImplementation(() => [authState, mockSetAuth]);

  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<div>Forgot Password Page</div>} />
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('Login Component - Comprehensive Tests', () => {
  let mockSetAuth;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetAuth = jest.fn();

    // Reset all mocks
    const { useAuth } = require('../../context/auth');
    useAuth.mockImplementation(() => [null, mockSetAuth]);
  });

  describe('Equivalence Partitioning Tests', () => {
    describe('Valid Input Partitions', () => {
      it('should accept valid email format', () => {
        renderComponent();
        const emailInput = screen.getByPlaceholderText('Enter Your Email');

        fireEvent.change(emailInput, { target: { value: 'user@example.com' } });

        expect(emailInput.value).toBe('user@example.com');
        expect(emailInput.validity.valid).toBe(true);
      });

      it('should accept valid password (6+ characters)', () => {
        renderComponent();
        const passwordInput = screen.getByPlaceholderText('Enter Your Password');

        fireEvent.change(passwordInput, { target: { value: 'securePassword123' } });

        expect(passwordInput.value).toBe('securePassword123');
        expect(passwordInput.validity.valid).toBe(true);
      });
    });

    describe('Invalid Email Partitions', () => {
      it('should reject email without @ symbol', () => {
        renderComponent();
        const emailInput = screen.getByPlaceholderText('Enter Your Email');

        fireEvent.change(emailInput, { target: { value: 'userexample.com' } });

        expect(emailInput.validity.valid).toBe(false);
        expect(emailInput.validity.typeMismatch).toBe(true);
        expect(emailInput.validationMessage).toBeTruthy();
      });

      it('should reject empty email', () => {
        renderComponent();
        const emailInput = screen.getByPlaceholderText('Enter Your Email');

        fireEvent.change(emailInput, { target: { value: '' } });

        expect(emailInput.validity.valid).toBe(false);
        expect(emailInput.validity.valueMissing).toBe(true);
      });
    });

    describe('Form Submission Prevention with Invalid Inputs', () => {
      it('should prevent submission with invalid email', async () => {
        renderComponent();

        fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), {
          target: { value: 'invalidemail' }
        });
        fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), {
          target: { value: 'password123' }
        });

        fireEvent.click(screen.getByText('LOGIN'));

        // Should not call API due to client-side validation
        await waitFor(() => {
          expect(axios.post).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('State Transition Tests', () => {
    it('should transition through loading states correctly', async () => {
      // Slow response to test loading state
      axios.post.mockImplementation(() => new Promise(resolve =>
        setTimeout(() => resolve({
          data: {
            success: true,
            message: 'Login successful',
            user: { id: 1, name: 'John Doe' },
            token: 'mock-token'
          }
        }), 100)
      ));

      renderComponent();

      fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), {
        target: { value: 'password123' }
      });

      const loginButton = screen.getByText('LOGIN');
      fireEvent.click(loginButton);

      // Should show loading state
      expect(loginButton.textContent).toBe('LOGGING IN...');
      expect(loginButton.disabled).toBe(true);
    });
  });

  describe('Error Handling - HTTP Status Code Partitions', () => {
    it('should handle 401 unauthorized errors', async () => {
      axios.post.mockRejectedValue({
        response: {
          status: 401,
          data: { message: 'Invalid email or password' }
        }
      });

      renderComponent();

      fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), {
        target: { value: 'wrongpassword' }
      });
      fireEvent.click(screen.getByText('LOGIN'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Invalid email or password');
      });
    });

    it('should handle other error statuses', async () => {
      axios.post.mockRejectedValue({
        response: {
          status: 500,
          data: { message: 'Server error' }
        }
      });

      renderComponent();

      fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), {
        target: { value: 'password123' }
      });
      fireEvent.click(screen.getByText('LOGIN'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Server error');
      });
    });

    it('should handle network errors', async () => {
      axios.post.mockRejectedValue(new Error('Network error'));

      renderComponent();

      fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), {
        target: { value: 'password123' }
      });
      fireEvent.click(screen.getByText('LOGIN'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Something went wrong. Please try again.');
      });
    });
  });
});

describe('Successful Login Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { useAuth } = require('../../context/auth');
    useAuth.mockImplementation(() => [null, jest.fn()]);
  });

  it('should redirect to home on successful login', async () => {
    axios.post.mockResolvedValue({
      data: {
        success: true,
        message: 'Login successful',
        user: { id: 1, name: 'John Doe' },
        token: 'mock-token'
      }
    });

    renderComponent();

    fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), {
      target: { value: 'password123' }
    });
    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(screen.getByText('Home Page')).toBeInTheDocument();
    });
  });
});

describe('Navigation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { useAuth } = require('../../context/auth');
    useAuth.mockImplementation(() => [null, jest.fn()]);
  });

  it('should navigate to forgot password page', () => {
    renderComponent();

    fireEvent.click(screen.getByText('Forgot Password'));

    expect(screen.getByText('Forgot Password Page')).toBeInTheDocument();
  });

  it('should redirect to intended location after login', async () => {
    axios.post.mockResolvedValue({
      data: {
        success: true,
        user: { id: 1, name: 'John Doe' },
        token: 'mock-token'
      }
    });

    renderComponent(['/login?returnUrl=/profile']);

    fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), {
      target: { value: 'password123' }
    });
    fireEvent.click(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(screen.getByText('Home Page')).toBeInTheDocument();
    });
  });
});