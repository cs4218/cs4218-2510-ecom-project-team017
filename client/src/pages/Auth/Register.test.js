import React from 'react';
import { render, fireEvent, waitFor, screen, cleanup } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import Register from './Register';

// Mock dependencies
jest.mock('axios');
jest.mock('react-hot-toast');
jest.mock('../../context/auth', () => ({
  useAuth: jest.fn(() => [null, jest.fn()])
}));
jest.mock('../../context/cart', () => ({
  useCart: jest.fn(() => [null, jest.fn()])
}));
jest.mock('../../context/search', () => ({
  useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()])
}));
jest.mock("../../hooks/useCategory", () => jest.fn(() => []));
jest.mock("./../../components/Layout", () => {
  return function MockLayout({ children, title }) {
    return <div data-testid="mock-layout">{children}</div>;
  };
});

// Test helper function
const renderComponent = (initialEntries = ['/register']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  );
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Register Component - Password Validation with Boundary Value Analysis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const fillForm = (password = 'password123') => {
    fireEvent.change(screen.getByPlaceholderText('Enter Your Name'), {
      target: { value: 'John Doe' }
    });
    fireEvent.change(screen.getByPlaceholderText('Enter Your Email'), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByPlaceholderText('Enter Your Password'), {
      target: { value: password }
    });
    fireEvent.change(screen.getByPlaceholderText('Enter Your Phone'), {
      target: { value: '1234567890' }
    });
    fireEvent.change(screen.getByPlaceholderText('Enter Your Address'), {
      target: { value: '123 Street' }
    });
    fireEvent.change(screen.getByPlaceholderText('Enter Your DOB'), {
      target: { value: '2000-01-01' }
    });
    fireEvent.change(screen.getByPlaceholderText('What is Your Favorite sports'), {
      target: { value: 'Football' }
    });
  };

  describe('Boundary Value Analysis for Password Length', () => {
    // Test cases around the boundary of 6 characters
    const boundaryTestCases = [
      // Lower boundary (invalid)
      { password: 'abcde', description: '5 character password', shouldSubmit: false },

      // Exact boundary (valid)
      { password: 'abcdef', description: 'exactly 6 character password', shouldSubmit: true },

      // Upper boundary (valid)
      { password: 'abcdefg', description: '7 character password', shouldSubmit: true },
    ];

    boundaryTestCases.forEach(({ password, description, shouldSubmit }) => {
      it(`should ${shouldSubmit ? 'allow' : 'prevent'} registration with ${description}`, async () => {
        axios.post.mockResolvedValue({
          data: { success: true }
        });

        renderComponent();
        fillForm(password);

        fireEvent.click(screen.getByText('REGISTER'));

        if (shouldSubmit) {
          await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith('/api/v1/auth/register', {
              name: 'John Doe',
              email: 'test@example.com',
              password: password,
              phone: '1234567890',
              address: '123 Street',
              DOB: '2000-01-01',
              answer: 'Football'
            });
          });

          expect(toast.success).toHaveBeenCalledWith('Register Successfully, please login');
        } else {
          await waitFor(() => {
            expect(axios.post).not.toHaveBeenCalled();
          });

          expect(toast.error).toHaveBeenCalledWith('Password must be at least 6 characters long');
        }
      });
    });
  });

  describe('Real-time Password Validation', () => {
    it('should show error message when password is too short', () => {
      renderComponent();

      const passwordInput = screen.getByPlaceholderText('Enter Your Password');

      // Type a short password
      fireEvent.change(passwordInput, { target: { value: 'abc' } });

      expect(screen.getByText('Password must be at least 6 characters long')).toBeInTheDocument();
      expect(passwordInput).toHaveClass('is-invalid');
    });

    it('should clear error message when password becomes valid', () => {
      renderComponent();

      const passwordInput = screen.getByPlaceholderText('Enter Your Password');

      // Type a short password (should show error)
      fireEvent.change(passwordInput, { target: { value: 'abc' } });
      expect(screen.getByText('Password must be at least 6 characters long')).toBeInTheDocument();

      // Type a valid password (should clear error)
      fireEvent.change(passwordInput, { target: { value: 'abcdef' } });
      expect(screen.queryByText('Password must be at least 6 characters long')).not.toBeInTheDocument();
      expect(passwordInput).not.toHaveClass('is-invalid');
    });

    it('should not show error for empty password on initial render', () => {
      renderComponent();

      expect(screen.queryByText('Password must be at least 6 characters long')).not.toBeInTheDocument();
    });
  });

  describe('Successful Registration', () => {
    it('should register successfully with valid 6-character password', async () => {
      axios.post.mockResolvedValueOnce({
        data: { success: true }
      });

      renderComponent();
      fillForm('123456'); // Exactly 6 characters

      fireEvent.click(screen.getByText('REGISTER'));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith('Register Successfully, please login');
      });
    });

    it('should navigate to login page on successful registration', async () => {
      axios.post.mockResolvedValueOnce({
        data: { success: true }
      });

      renderComponent();
      fillForm('validpass');

      fireEvent.click(screen.getByText('REGISTER'));

      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on failed registration with valid password', async () => {
      axios.post.mockRejectedValueOnce({
        response: { data: { message: 'User already exists' } }
      });

      renderComponent();
      fillForm('validpassword123');

      fireEvent.click(screen.getByText('REGISTER'));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith('Something went wrong');
      });
    });

    it('should prevent API call and show validation error for short password', async () => {
      renderComponent();
      fillForm('short'); // 5 characters

      fireEvent.click(screen.getByText('REGISTER'));

      await waitFor(() => {
        expect(axios.post).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith('Password must be at least 6 characters long');
      });
    });
  });

  describe('Form Submission Behavior', () => {
    it('should clear password error on successful validation before submission', async () => {
      axios.post.mockResolvedValueOnce({
        data: { success: true }
      });

      renderComponent();

      // First, set an invalid password
      const passwordInput = screen.getByPlaceholderText('Enter Your Password');
      fireEvent.change(passwordInput, { target: { value: 'short' } });
      expect(screen.getByText('Password must be at least 6 characters long')).toBeInTheDocument();

      // Then set a valid password and submit
      fireEvent.change(passwordInput, { target: { value: 'validpassword' } });
      fillForm('validpassword');

      fireEvent.click(screen.getByText('REGISTER'));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith('Register Successfully, please login');
      });
    });
  });
});