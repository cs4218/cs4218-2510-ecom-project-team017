import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import Categories from './Categories.js';
import { beforeEach } from 'node:test';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from "axios";


jest.mock('axios');
// Mock Layout
jest.mock("../components/Layout", () => {
    return function Layout({ children }) {
        return <div>{children}</div>;
    };
});
const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

const mockCategories = [{
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
}
];

describe('Category Page with use of Hook', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render the category page using useCategory hook', async () => {
        axios.get.mockResolvedValueOnce({
            data: {
                category: mockCategories
            }
        });

        const { getByText, getByRole } = render(
    <MemoryRouter initialEntries={['/categories']}>
        <Routes>
            <Route path='/categories' element={<Categories />} />
        </Routes>
    </MemoryRouter>
        );

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
            expect(getByText('Electronics')).toBeInTheDocument();
            expect(getByText('Book')).toBeInTheDocument();
        });

        expect(getByRole('link', { name: 'Electronics' })).toHaveAttribute('href', '/category/electronics');
        expect(getByRole('link', { name: 'Book' })).toHaveAttribute('href', '/category/book');
    });

    it('handles API failure gracefully', async () => {
        axios.get.mockRejectedValueOnce(new Error('API error'));

        const { queryAllByRole } = render(
            <MemoryRouter initialEntries={['/categories']}>
                <Routes>
                    <Route path='/categories' element={<Categories />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            // Expect no categories to be rendered
            expect(queryAllByRole('link').length).toBe(0);
        });
        expect(logSpy).toHaveBeenCalled();
        expect(axios.get).toHaveBeenCalled();
    });
});