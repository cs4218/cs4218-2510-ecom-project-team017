import { hashPassword, comparePassword } from './authHelper';

// NO jest.mock here - uses real bcrypt

describe('Password Helper Functions - Integration Tests', () => {
    const testPassword = 'testPassword123';

    it('should hash and compare passwords correctly', async () => {
        const hashed = await hashPassword(testPassword);

        // Verify hash is different from original and has correct format
        expect(hashed).not.toBe(testPassword);
        expect(hashed).toMatch(/^\$2[aby]\$\d+\$.{53}$/); // bcrypt hash format

        // Verify comparison works
        const isValid = await comparePassword(testPassword, hashed);
        expect(isValid).toBe(true);

        // Verify wrong password fails
        const isWrongValid = await comparePassword('wrongPassword', hashed);
        expect(isWrongValid).toBe(false);
    });

    it('should handle empty passwords', async () => {
        const hashed = await hashPassword('');
        expect(hashed).toBeDefined();

        const isValid = await comparePassword('', hashed);
        expect(isValid).toBe(true);
    });
});