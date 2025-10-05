import '@testing-library/jest-dom/extend-expect';
import { render, fireEvent, waitFor } from '@testing-library/react';
import axios from "axios";
import React from 'react';
import toast from "react-hot-toast";
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CreateCategory from './CreateCategory.js';

jest.mock('axios');
jest.mock('react-hot-toast');
const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
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

jest.mock('../../components/Form/CategoryForm', () => {
  return function CategoryForm({ handleSubmit, value, setValue }) {
    return <form onSubmit={handleSubmit} data-testid="category-form">
      <input
        data-testid="category-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        minLength='1'
        maxLength='255'
      />
      <button type="submit">Submit</button>
    </form>
  };
});

const mockUseCategory = [
  {
    _id: "66db427fdb0119d9234b27ed",
    name: "Electronics",
    slug: "electronics",
    __v: 0
  },
  {
    _id: "66db427fdb0119d9234b27ef",
    name: "Book",
    slug: "book",
    __v: 0
  },
  {
    _id: "66db427fdb0119d9234b27ee",
    name: "Clothing",
    slug: "clothing",
    __v: 0
  }
];

describe('CreateCategory Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockResolvedValue({
      data: {
        success: true,
        message: "All Categories List",
        category: mockUseCategory
      }
    });
  })

  it('renders create categories page', async () => {
    const { getByText, getByTestId } = render(
      <MemoryRouter initialEntries={['/create-category']}>
        <Routes>
          <Route path='/create-category' element={<CreateCategory />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
      expect(getByText('Electronics')).toBeInTheDocument();
      expect(getByText('Book')).toBeInTheDocument();
      expect(getByText('Clothing')).toBeInTheDocument();
    });

    expect(getByText('Manage Category')).toBeInTheDocument();
    expect(getByTestId('admin-menu')).toBeInTheDocument();
    expect(getByTestId('category-form')).toBeInTheDocument();
  });

  it('should handle inablity to get categories', async () => {
    axios.get.mockRejectedValue(error);
    const { } = render(
      <MemoryRouter initialEntries={['/create-category']}>
        <Routes>
          <Route path='/create-category' element={<CreateCategory />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => { expect(axios.get).toHaveBeenCalled() });
    expect(toast.error).toHaveBeenCalledWith("Something went wrong in getting catgeory");
  });

  // Test category creation
  it('should handle category creation', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        success: true
      }
    });

    const { getByTestId } = render(
      <MemoryRouter initialEntries={['/create-category']}>
        <Routes>
          <Route path='/create-category' element={<CreateCategory />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category'));

    const input = getByTestId('category-input');
    const form = getByTestId('category-form');

    fireEvent.change(input, { target: { value: 'Test Category' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/v1/category/create-category', { name: 'Test Category' });
      expect(toast.success).toHaveBeenCalledWith(`Test Category is created`);
      expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category');
    });
    expect(input.value).toBe('');
  });

  it('should handle invalid inputs when creating category', async () => {
    const { getByTestId } = render(
      <MemoryRouter initialEntries={['/create-category']}>
        <Routes>
          <Route path='/create-category' element={<CreateCategory />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category'));

    const input = getByTestId('category-input');
    const form = getByTestId('category-form');

    // Check if category is exists
    fireEvent.change(input, { target: { value: 'Electronics' } });
    fireEvent.submit(form);
    expect(toast.error).toHaveBeenCalledWith("Category already exists");

    // Check if input is undefined or empty
    toast.error.mockClear()
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.submit(form);
    expect(toast.error).toHaveBeenCalledWith('Category name should have length of at least one character');

    // Check for symbols
    toast.error.mockClear()
    fireEvent.change(input, { target: { value: '*******' } });
    fireEvent.submit(form);
    expect(toast.error).toHaveBeenCalledWith('Category name cannot contain special chararcters');

    // Check for symbols within valid characters
    toast.error.mockClear()
    fireEvent.change(input, { target: { value: 'abc*ef' } });
    fireEvent.submit(form);
    expect(toast.error).toHaveBeenCalledWith('Category name cannot contain special chararcters');

    // Check for category name of length > 255
    toast.error.mockClear()
    fireEvent.change(input, { target: { value: 'a'.repeat(256) } });
    fireEvent.submit(form);
    expect(toast.error).toHaveBeenCalledWith("Category name cannot contain more than 255 chararcters");
  });

  it('should handle unsuccessful category creation', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        success: false,
        message: "Unable to create new category"
      }
    });

    const { getByTestId } = render(
      <MemoryRouter initialEntries={['/create-category']}>
        <Routes>
          <Route path='/create-category' element={<CreateCategory />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category'));

    const input = getByTestId('category-input');
    const form = getByTestId('category-form');

    fireEvent.change(input, { target: { value: 'Test Category' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/v1/category/create-category', { name: 'Test Category' });
      expect(toast.error).toHaveBeenCalledWith("Unable to create new category");
    });
  });

  it('should handle error thrown during category creation', async () => {
    axios.post.mockRejectedValueOnce(error);

    const { getByTestId } = render(
      <MemoryRouter initialEntries={['/create-category']}>
        <Routes>
          <Route path='/create-category' element={<CreateCategory />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category'));

    const input = getByTestId('category-input');
    const form = getByTestId('category-form');

    fireEvent.change(input, { target: { value: 'Test Category' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something went wrong in input form");
    });
  });


  // Test updating category name
  it('should handle edits to category name', async () => {
    axios.put.mockResolvedValueOnce({
      data: {
        success: true
      }
    });

    const { getByText, getAllByText, getAllByTestId } = render(
      <MemoryRouter initialEntries={['/create-category']}>
        <Routes>
          <Route path='/create-category' element={<CreateCategory />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category');
      expect(getByText('Electronics')).toBeInTheDocument();
    });

    const editButton = getAllByText('Edit')[0];
    fireEvent.click(editButton);

    const input = getAllByTestId("category-input")[1];
    const form = getAllByTestId('category-form')[1];

    expect(input.value).toBe('Electronics');
    fireEvent.change(input, { target: { value: 'tronics' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith('/api/v1/category/update-category/66db427fdb0119d9234b27ed', { name: 'tronics' });
      expect(toast.success).toHaveBeenCalledWith(`tronics is updated`);
      expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category');
    });
  });

  it('should handle invalid inputs when updating category name', async () => {
    const { getByText, getAllByText, getAllByTestId } = render(
      <MemoryRouter initialEntries={['/create-category']}>
        <Routes>
          <Route path='/create-category' element={<CreateCategory />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category');
      expect(getByText('Electronics')).toBeInTheDocument();
    });

    const editButton = getAllByText('Edit')[0];
    fireEvent.click(editButton);

    const input = getAllByTestId("category-input")[1];
    const form = getAllByTestId('category-form')[1];

    expect(input.value).toBe('Electronics');

    // Check if category is exists
    fireEvent.change(input, { target: { value: 'Electronics' } });
    fireEvent.submit(form);
    expect(toast.error).toHaveBeenCalledWith("Category already exists");

    // Check if input is undefined or empty
    toast.error.mockClear()
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.submit(form);
    expect(toast.error).toHaveBeenCalledWith('Category name should have length of at least one character');

    // Check for symbols
    toast.error.mockClear()
    fireEvent.change(input, { target: { value: '*******' } });
    fireEvent.submit(form);
    expect(toast.error).toHaveBeenCalledWith('Category name cannot contain special chararcters');

    // Check for symbols within valid characters
    toast.error.mockClear()
    fireEvent.change(input, { target: { value: 'abc*ef' } });
    fireEvent.submit(form);
    expect(toast.error).toHaveBeenCalledWith('Category name cannot contain special chararcters');

    // Check for category name of length > 255
    toast.error.mockClear()
    fireEvent.change(input, { target: { value: 'a'.repeat(256) } });
    fireEvent.submit(form);
    expect(toast.error).toHaveBeenCalledWith("Category name cannot contain more than 255 chararcters");
  });

  it('should handle unsuccessful edits to category name', async () => {
    axios.put.mockResolvedValueOnce({
      data: {
        success: false,
        message: "Unable to update category name"
      }
    });

    const { getByText, getAllByText, getAllByTestId } = render(
      <MemoryRouter initialEntries={['/create-category']}>
        <Routes>
          <Route path='/create-category' element={<CreateCategory />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category');
      expect(getByText('Electronics')).toBeInTheDocument();
    });

    const editButton = getAllByText('Edit')[0];
    fireEvent.click(editButton);

    const input = getAllByTestId("category-input")[1];
    const form = getAllByTestId('category-form')[1];

    expect(input.value).toBe('Electronics');
    fireEvent.change(input, { target: { value: 'tronics' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith('/api/v1/category/update-category/66db427fdb0119d9234b27ed', { name: 'tronics' });
      expect(toast.error).toHaveBeenCalledWith(`Unable to update category name`);
    });
  });

  it('should handle thrown error when updating category name', async () => {
    axios.put.mockRejectedValueOnce(error);

    const { getByText, getAllByText, getAllByTestId } = render(
      <MemoryRouter initialEntries={['/create-category']}>
        <Routes>
          <Route path='/create-category' element={<CreateCategory />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category');
      expect(getByText('Electronics')).toBeInTheDocument();
    });

    const editButton = getAllByText('Edit')[0];
    fireEvent.click(editButton);

    const input = getAllByTestId("category-input")[1];
    const form = getAllByTestId('category-form')[1];

    expect(input.value).toBe('Electronics');
    fireEvent.change(input, { target: { value: 'tronics' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    });
  });

  // Testing category deletion
  it('should handle category deletion', async () => {
    axios.delete.mockResolvedValueOnce({
      data: {
        success: true
      }
    });

    const { getByText, getAllByText } = render(
      <MemoryRouter initialEntries={['/create-category']}>
        <Routes>
          <Route path='/create-category' element={<CreateCategory />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category');
      expect(getByText('Electronics')).toBeInTheDocument();
    });

    const deleteButton = getAllByText('Delete')[0];
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith('/api/v1/category/delete-category/66db427fdb0119d9234b27ed');
      expect(toast.success).toHaveBeenCalledWith(`Category is deleted`);
      expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category');
    });
  });

  it('should handle unsuccessful category deletion', async () => {
    axios.delete.mockResolvedValueOnce({
      data: {
        success: false,
        message: "Unable to delete category"
      }
    });

    const { getByText, getAllByText, } = render(
      <MemoryRouter initialEntries={['/create-category']}>
        <Routes>
          <Route path='/create-category' element={<CreateCategory />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category');
      expect(getByText('Electronics')).toBeInTheDocument();
    });

    const deleteButton = getAllByText('Delete')[0];
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith('/api/v1/category/delete-category/66db427fdb0119d9234b27ed');
      expect(toast.error).toHaveBeenCalledWith("Unable to delete category");
    });
  });

  it('should handle thrown error in category deletion', async () => {
    axios.delete.mockRejectedValueOnce(error);

    const { getByText, getAllByText } = render(
      <MemoryRouter initialEntries={['/create-category']}>
        <Routes>
          <Route path='/create-category' element={<CreateCategory />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category');
      expect(getByText('Electronics')).toBeInTheDocument();
    });

    const deleteButton = getAllByText('Delete')[0];
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    });
  });

});