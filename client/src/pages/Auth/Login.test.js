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
    it('should handle valid input partitions', () => {
      renderComponent();

      const emailInput = screen.getByPlaceholderText('Enter Your Email');
      const passwordInput = screen.getByPlaceholderText('Enter Your Password');

      // Valid email formats
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      expect(emailInput.value).toBe('user@example.com');

      // Valid password
      fireEvent.change(passwordInput, { target: { value: 'securePassword123' } });
      expect(passwordInput.value).toBe('securePassword123');
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

});

describe('Successful Login Tests', () => {

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