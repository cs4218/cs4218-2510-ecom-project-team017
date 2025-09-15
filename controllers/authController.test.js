import jwt from 'jsonwebtoken';
import {
    registerController,
    loginController,
    forgotPasswordController,
} from '../controllers/authController.js';
import userModel from '../models/userModel.js';
import { hashPassword, comparePassword } from '../helpers/authHelper.js';

// Mock all dependencies
jest.mock('../models/userModel');
jest.mock('../helpers/authHelper');
jest.mock('jsonwebtoken');

describe('Auth Controllers - Basic Unit Tests', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = { body: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };
    });

    // Test 1: Register Controller - Missing Fields
    test('registerController should return error for missing name', async () => {
        req.body = { email: 'test@test.com', password: '123' };
        await registerController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: expect.any(String)
            })
        );
    });

    // Test 2: Register Controller - Success
    test('registerController should create user successfully', async () => {
        req.body = {
            name: 'John',
            email: 'test@test.com',
            password: '123',
            phone: '1234567890',
            address: 'Test St',
            answer: 'Test Answer'
        };

        userModel.findOne.mockResolvedValue(null);
        hashPassword.mockResolvedValue('hashed123');
        userModel.prototype.save = jest.fn().mockResolvedValue({
            _id: '1', name: 'John', email: 'test@test.com'
        });

        await registerController(req, res);

        expect(hashPassword).toHaveBeenCalledWith('123');
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: 'User registered successfully'
            })
        );
    });

    // Test 3: Login Controller - Invalid Credentials
    test('loginController should reject invalid password', async () => {
        req.body = { email: 'test@test.com', password: 'wrong' };

        userModel.findOne.mockResolvedValue({
            _id: '1', email: 'test@test.com', password: 'hashed123'
        });
        comparePassword.mockResolvedValue(false);

        await loginController(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: 'Invalid email or password'
            })
        );
    });

    // Test 4: Login Controller - Success
    test('loginController should login successfully', async () => {
        req.body = { email: 'test@test.com', password: 'correct' };

        userModel.findOne.mockResolvedValue({
            _id: '1',
            name: 'John',
            email: 'test@test.com',
            password: 'hashed123',
            phone: '1234567890',
            address: 'Test St',
            role: 'user'
        });
        comparePassword.mockResolvedValue(true);
        jwt.sign.mockReturnValue('fake-token-123');

        await loginController(req, res);

        expect(jwt.sign).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                token: 'fake-token-123'
            })
        );
    });

    // Test 5: Forgot Password - Missing Email
    test('forgotPasswordController should require email', async () => {
        req.body = { answer: 'test', newPassword: 'new123' };
        await forgotPasswordController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    // Test 6: Forgot Password - Success
    test('forgotPasswordController should reset password', async () => {
        req.body = {
            email: 'test@test.com',
            answer: 'correct-answer',
            newPassword: 'new123'
        };

        userModel.findOne.mockResolvedValue({
            _id: '1', email: 'test@test.com', answer: 'correct-answer'
        });
        hashPassword.mockResolvedValue('hashed-new-123');
        userModel.findByIdAndUpdate = jest.fn().mockResolvedValue({});

        await forgotPasswordController(req, res);

        expect(hashPassword).toHaveBeenCalledWith('new123');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: 'Password reset successfully'
            })
        );
    });

    // Test 7: Error Handling
    test('should handle database errors', async () => {
        req.body = {
            name: 'John',
            email: 'test@test.com',
            password: '123',
            phone: '1234567890',
            address: 'Test St',
            answer: 'Test Answer'
        };

        userModel.findOne.mockRejectedValue(new Error('DB Connection failed'));
        await registerController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });
});