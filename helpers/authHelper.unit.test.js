import { hashPassword, comparePassword } from './authHelper';

// Mock bcrypt module ONLY for unit tests
jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn()
}));

// Import the mocked bcrypt after mocking
const bcrypt = require('bcrypt');

describe('Password Helper Functions - Unit Tests', () => {
    const mockPassword = 'testPassword123';
    const mockHashedPassword = '$2b$10$mockHashedPasswordString';

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('hashPassword', () => {
        it('should hash a password successfully', async () => {
            bcrypt.hash.mockResolvedValue(mockHashedPassword);

            const result = await hashPassword(mockPassword);

            expect(bcrypt.hash).toHaveBeenCalledWith(mockPassword, 10);
            expect(result).toBe(mockHashedPassword);
        });

        it('should handle errors when hashing fails', async () => {
            const mockError = new Error('Hashing failed');
            bcrypt.hash.mockRejectedValue(mockError);
            console.log = jest.fn();

            const result = await hashPassword(mockPassword);

            expect(bcrypt.hash).toHaveBeenCalledWith(mockPassword, 10);
            expect(console.log).toHaveBeenCalledWith(mockError);
            expect(result).toBeUndefined();
        });
    });

    describe('comparePassword', () => {
        it('should compare password with hashed password successfully', async () => {
            const mockComparisonResult = true;
            bcrypt.compare.mockResolvedValue(mockComparisonResult);

            const result = await comparePassword(mockPassword, mockHashedPassword);

            expect(bcrypt.compare).toHaveBeenCalledWith(mockPassword, mockHashedPassword);
            expect(result).toBe(mockComparisonResult);
        });

        it('should return false when comparison fails', async () => {
            const mockComparisonResult = false;
            bcrypt.compare.mockResolvedValue(mockComparisonResult);

            const result = await comparePassword('wrongPassword', mockHashedPassword);

            expect(bcrypt.compare).toHaveBeenCalledWith('wrongPassword', mockHashedPassword);
            expect(result).toBe(mockComparisonResult);
        });

        it('should handle errors when comparison throws', async () => {
            const mockError = new Error('Comparison failed');
            bcrypt.compare.mockRejectedValue(mockError);

            // If your comparePassword function doesn't handle errors,
            // this test will verify that the error is propagated
            await expect(comparePassword(mockPassword, mockHashedPassword))
                .rejects.toThrow('Comparison failed');
        });
    });
});