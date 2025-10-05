import '@testing-library/jest-dom/extend-expect';
import axios from "axios";
import React from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import useCategory from './useCategory.js';

jest.mock('axios');
const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
const mockCategories = [
    {
        "_id": "66db427fdb0119d9234b27ef",
        "name": "Book",
        "slug": "book",
        "__v": 0
    }
];

describe('try get categories', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('successful invocation of get categories api', async () => {

        axios.get.mockResolvedValueOnce({
            data: {
                category: mockCategories
            }
        });

        const { result } = renderHook(() => useCategory());

        await waitFor(() => expect(axios.get).toHaveBeenCalled());
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    });

    it('unsuccessful invocation of get categories api', async () => {
        axios.get.mockRejectedValueOnce(new Error('API error'));

        const { result } = renderHook(() => useCategory());

        await waitFor(() => expect(axios.get).toHaveBeenCalled());
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
        expect(logSpy).toHaveBeenCalled();
    });

    it('should update the category state upon successful invocation of api', async () => {
        axios.get.mockResolvedValueOnce({
            data: {
                category: mockCategories
            }
        });

        const { result } = renderHook(() => useCategory());

        await waitFor(() => {
            expect(result.current).toEqual(mockCategories);
        });
    });

    it('should not update the category state upon unsuccessful invocation of api', async () => {
        axios.get.mockRejectedValueOnce(new Error('API error'));

        const { result } = renderHook(() => useCategory());

        await waitFor(() => {
            expect(result.current).toEqual([]);
        });
    });
});