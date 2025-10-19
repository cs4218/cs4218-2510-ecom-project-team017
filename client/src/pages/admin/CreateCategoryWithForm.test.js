import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CreateCategory from './CreateCategory.js';
import toast from "react-hot-toast";
import axios from "axios";

jest.mock('axios');
jest.mock('react-hot-toast');
const error = new Error('API error');

// Mock Layout
jest.mock("../../components/Layout", () => {
  return function Layout({ children }) {
    return <div>{children}</div>;
  };
});

jest.mock('../../components/AdminMenu', () => {
  return function AdminMenu() {
    return <div data-testid="admin-menu">Admin Menu</div>;
  };
});

const mockUseCategory = [
  {
    _id: "66db427fdb0119d9234b27ed",
    name: "Electronics",
    slug: "electronics",
    __v: 0
  }
];

describe('Create Category with Category Form', () => {

  beforeEach(() => {
    jest.clearAllMocks();

    axios.get.mockResolvedValue({
      data: {
        success: true,
        message: "All Categories List",
        category: mockUseCategory
      }
    });

  });

  it('should render the create category page successfully', async () => {
    const { getByText, getByTestId, getByPlaceholderText } = render(
      <MemoryRouter initialEntries={['/create-category']}>
        <Routes>
          <Route path='/create-category' element={<CreateCategory />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
      expect(getByText('Electronics')).toBeInTheDocument();
    });

    expect(getByText('Manage Category')).toBeInTheDocument();
    expect(getByText('Submit')).toBeInTheDocument();
    expect(getByTestId('admin-menu')).toBeInTheDocument();
    expect(getByPlaceholderText('Enter new category')).toBeInTheDocument();
  });

  it('should successfully create a new category', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        success: true
      }
    });

    const { getByText, getByPlaceholderText } = render(
      <MemoryRouter initialEntries={['/create-category']}>
        <Routes>
          <Route path='/create-category' element={<CreateCategory />} />
        </Routes>
      </MemoryRouter>
    );

    const input = getByPlaceholderText('Enter new category');
    const submitButton = getByText('Submit');

    fireEvent.change(input, { target: { value: 'Test Category' } });
    fireEvent.submit(submitButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/v1/category/create-category', { name: 'Test Category' });
      expect(toast.success).toHaveBeenCalledWith(`Test Category is created`);
    });
    expect(input.value).toBe('');
  });

  it('should handle error thrown during category creation', async () => {
    axios.post.mockRejectedValueOnce(error);

    const { getByText, getByPlaceholderText } = render(
      <MemoryRouter initialEntries={['/create-category']}>
        <Routes>
          <Route path='/create-category' element={<CreateCategory />} />
        </Routes>
      </MemoryRouter>
    );

    const input = getByPlaceholderText('Enter new category');
    const submitButton = getByText('Submit');

    fireEvent.change(input, { target: { value: 'Test Category' } });
    fireEvent.submit(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something went wrong in input form");
    });
    expect(input.value).toBe('Test Category');
  });

  it('should handle edits to category name', async () => {
    axios.put.mockResolvedValueOnce({
      data: {
        success: true
      }
    });

    const { getByText, queryByRole, findByRole } = render(
      <MemoryRouter initialEntries={['/create-category']}>
        <Routes>
          <Route path='/create-category' element={<CreateCategory />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getByText('Electronics')).toBeInTheDocument();
    });

    expect(queryByRole('dialog')).not.toBeInTheDocument();
    const editButton = getByText('Edit');
    fireEvent.click(editButton);

    const modal = await findByRole('dialog');
    await waitFor(() => {
      expect(modal).toBeVisible();
    });

    expect(within(modal).getByPlaceholderText('Enter new category')).toBeInTheDocument();
    expect(within(modal).getByText('Submit')).toBeInTheDocument();

    const input = within(modal).getByPlaceholderText('Enter new category');
    const submitButton = within(modal).getByText('Submit');

    expect(input.value).toBe('Electronics');
    fireEvent.change(input, { target: { value: 'tronics' } });
    fireEvent.submit(submitButton);

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith('/api/v1/category/update-category/66db427fdb0119d9234b27ed', { name: 'tronics' });
      expect(toast.success).toHaveBeenCalledWith(`tronics is updated`);
    });

    expect(queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should handle cancellation of edits to category name', async () => {
    axios.put.mockResolvedValueOnce({
      data: {
        success: true
      }
    });

    const { getByText, queryByRole, findByRole } = render(
      <MemoryRouter initialEntries={['/create-category']}>
        <Routes>
          <Route path='/create-category' element={<CreateCategory />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getByText('Electronics')).toBeInTheDocument();
    });

    expect(queryByRole('dialog')).not.toBeInTheDocument();
    const editButton = getByText('Edit');
    fireEvent.click(editButton);

    const modal = await findByRole('dialog');
    await waitFor(() => {
      expect(modal).toBeVisible();
    });

    expect(within(modal).getByPlaceholderText('Enter new category')).toBeInTheDocument();
    expect(within(modal).getByText('Submit')).toBeInTheDocument();

    const cancelButton = within(modal).getByRole('button', { name: /close/i });
    fireEvent.click(cancelButton);

    expect(queryByRole('dialog')).not.toBeInTheDocument();
  });


}); 