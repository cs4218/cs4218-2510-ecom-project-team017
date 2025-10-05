import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CategoryForm from './CategoryForm.js';

// Stub and mock input constraints
var testValue = '';
const handleSubmit = jest.fn((e) => {
    e.preventDefault();
});

const setValue = jest.fn();

describe('Create New Category Form', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders category form', () => {
        const { getByPlaceholderText } = render(
            <MemoryRouter initialEntries={['/dashboard/admin/create-category']}>
                <Routes>
                    <Route path="/dashboard/admin/create-category"
                        element={<CategoryForm handleSubmit={handleSubmit} value={testValue} setValue={setValue} />} />
                </Routes>
            </MemoryRouter>
        );

        expect(getByPlaceholderText('Enter new category')).toBeInTheDocument();
    });

    it('input should be initially empty', () => {
        const { getByPlaceholderText } = render(
            <MemoryRouter initialEntries={['/dashboard/admin/create-category']}>
                <Routes>
                    <Route path="/dashboard/admin/create-category"
                        element={<CategoryForm handleSubmit={handleSubmit} value={testValue} setValue={setValue} />} />
                </Routes>
            </MemoryRouter>
        );

        expect(getByPlaceholderText('Enter new category').value).toBe('');
    })

    it('initial input not empty', () => {
        testValue = 'Electronics';

        const { getByPlaceholderText } = render(
            <MemoryRouter initialEntries={['/dashboard/admin/create-category']}>
                <Routes>
                    <Route path="/dashboard/admin/create-category"
                        element={<CategoryForm handleSubmit={handleSubmit} value={testValue} setValue={setValue} />} />
                </Routes>
            </MemoryRouter>
        );

        expect(getByPlaceholderText('Enter new category').value).toBe('Electronics');
    })

    it('should allow typing new category name', () => {
        const { getByPlaceholderText } = render(
            <MemoryRouter initialEntries={['/dashboard/admin/create-category']}>
                <Routes>
                    <Route path="/dashboard/admin/create-category"
                        element={<CategoryForm handleSubmit={handleSubmit} setValue={setValue} />} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.change(getByPlaceholderText('Enter new category'), { target: { value: 'test category' } });
        expect(getByPlaceholderText('Enter new category').value).toBe('test category');
        expect(setValue).toHaveBeenCalled();
    });

    it('should create new category successfully', () => {
        const { getByText, getByPlaceholderText } = render(
            <MemoryRouter initialEntries={['/dashboard/admin/create-category']}>
                <Routes>
                    <Route path="/dashboard/admin/create-category"
                        element={<CategoryForm handleSubmit={handleSubmit} setValue={setValue} />} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.change(getByPlaceholderText('Enter new category'), { target: { value: 'test category' } });
        fireEvent.click(getByText('Submit'));
        expect(getByPlaceholderText('Enter new category').value).toBe('test category');
        expect(setValue).toHaveBeenCalled();
        expect(handleSubmit).toHaveBeenCalled();
    });
});