import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { getAllByRole, render } from '@testing-library/react';
import Categories from './Categories.js';
import { beforeEach } from 'node:test';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import useCategory from '../hooks/useCategory.js';

jest.mock('../hooks/useCategory');
jest.mock('../context/auth.js', () => ({
    useAuth: jest.fn(() => [null, jest.fn()]) // Mock useAuth hook to return null state and a mock function for setAuth
  }));

  jest.mock('../context/cart', () => ({
    useCart: jest.fn(() => [null, jest.fn()]) // Mock useCart hook to return null state and a mock function
  }));
    
jest.mock('../context/search', () => ({
    useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()]) // Mock useSearch hook to return null state and a mock function
  }));  

// Mock Layout
jest.mock("../components/Layout", () => {
  return function Layout({ children }) {
    return <div>{children}</div>;
  };
});

const mockUseCategory = [{
      "_id": "66db427fdb0119d9234b27ed",
      "name": "Electronics",
      "slug": "electronics",
      "__v": 0
    },
    {
      "_id": "66db427fdb0119d9234b27ef",
      "name": "Book",
      "slug": "book",
      "__v": 0
    },
    {
      "_id": "66db427fdb0119d9234b27ee",
      "name": "Clothing",
      "slug": "clothing",
      "__v": 0
    }
  ]



describe ( 'Categories Page' , () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });
    

    it ('renders all categories page', () => {
        useCategory.mockReturnValue(mockUseCategory);

        const { getByText  } =  render(
            <MemoryRouter initialEntries={['/categories']}>
                <Routes>
                    <Route path='/categories' element={<Categories />} />
                </Routes>
            </MemoryRouter>
        );

        expect(getByText('Electronics')).toBeInTheDocument();
        expect(getByText('Book')).toBeInTheDocument();
        expect(getByText('Clothing')).toBeInTheDocument();
    });

    it ('renders all categories page with the correct links', () => {
        useCategory.mockReturnValue(mockUseCategory);

        const { getByRole  } =  render(
            <MemoryRouter initialEntries={['/categories']}>
                <Routes>
                    <Route path='/categories' element={<Categories />} />
                </Routes>
            </MemoryRouter>
        );
        
        expect(getByRole('link', {name: 'Electronics'})).toHaveAttribute('href', '/category/electronics');
        expect(getByRole('link', {name: 'Book'})).toHaveAttribute('href', '/category/book');
        expect(getByRole('link', {name: 'Clothing'})).toHaveAttribute('href', '/category/clothing');
    });

    it ('renders all categories page with no categories', () => {
        useCategory.mockReturnValue([]);

        const { queryAllByRole } =  render(
            <MemoryRouter initialEntries={['/categories']}>
                <Routes>
                    <Route path='/categories' element={<Categories />} />
                </Routes>
            </MemoryRouter>
        );

        expect(queryAllByRole('link')).toHaveLength(0);
    });
});