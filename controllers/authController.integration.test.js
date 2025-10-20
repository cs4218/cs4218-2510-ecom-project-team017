import { requireSignIn, isAdmin } from "../middlewares/authMiddleware.js";
import { testController } from "../controllers/authController.js";

import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";

jest.mock("../models/userModel.js", () => ({
    __esModule: true,
    default: { findById: jest.fn() },
}));

jest.mock("jsonwebtoken", () => ({
    __esModule: true,
    default: {
        verify: jest.fn(),
    },
    verify: jest.fn(),
}));

const makeRes = () => {
    const res = {};
    res.statusCode = 200;
    res.headers = {};
    res.body = undefined;

    res.status = jest.fn((code) => {
        res.statusCode = code;
        return res;
    });
    res.send = jest.fn((payload) => {
        res.body = payload;
        return res;
    });
    res.set = jest.fn((k, v) => {
        res.headers[k.toLowerCase()] = v;
        return res;
    });

    return res;
};

const runChain = async (handlers, req, res) => {
    let idx = 0;
    const next = async (err) => {
        if (err) throw err;
        const handler = handlers[idx++];
        if (!handler) return;
        return Promise.resolve(handler(req, res, next));
    };
    await next();
};

describe("requireSignIn → isAdmin → testController (whitebox chain)", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = "testsecret";
    });

    test("401 when Authorization header is missing", async () => {
        const req = { headers: {} };
        const res = makeRes();

        await runChain([requireSignIn, isAdmin, testController], req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(String(res.body?.message || res.body)).toMatch(/authorization header required/i);
    });

    test("401 when token is invalid (JsonWebTokenError)", async () => {
        const req = { headers: { authorization: "bad-token" } };
        const res = makeRes();

        jwt.verify.mockImplementation(() => {
            const e = new Error("jwt malformed");
            e.name = "JsonWebTokenError";
            throw e;
        });

        await runChain([requireSignIn, isAdmin, testController], req, res);

        expect(res.statusCode).toBe(401);
        expect(String(res.body?.message || res.body)).toMatch(/invalid token/i);
    });

    test("404 when JWT is valid but user does not exist", async () => {
        const req = { headers: { authorization: "valid-token" } };
        const res = makeRes();

        jwt.verify.mockReturnValue({ _id: "ghost-id" });
        userModel.findById.mockResolvedValueOnce(null);

        await runChain([requireSignIn, isAdmin, testController], req, res);

        expect(jwt.verify).toHaveBeenCalledWith("valid-token", "testsecret");
        expect(userModel.findById).toHaveBeenCalledWith("ghost-id");
        expect(res.statusCode).toBe(404);
        expect(String(res.body?.message || res.body)).toMatch(/user not found/i);
    });

    test("403 when user exists but is not admin", async () => {
        const req = { headers: { authorization: "user-token" } };
        const res = makeRes();

        jwt.verify.mockReturnValue({ _id: "user-1" });
        userModel.findById.mockResolvedValueOnce({ _id: "user-1", role: 0 });

        await runChain([requireSignIn, isAdmin, testController], req, res);

        expect(res.statusCode).toBe(403);
        expect(String(res.body?.message || res.body)).toMatch(/admin|insufficient/i);
    });

    test('200 and "Protected Routes" when user is admin', async () => {
        const req = { headers: { authorization: "admin-token" } };
        const res = makeRes();

        jwt.verify.mockReturnValue({ _id: "admin-1" });
        userModel.findById.mockResolvedValueOnce({ _id: "admin-1", role: 1 });

        await runChain([requireSignIn, isAdmin, testController], req, res);

        expect(res.statusCode).toBe(200);
        expect(res.body).toBe("Protected Routes");
    });

    test("401 when token expired (TokenExpiredError)", async () => {
        const req = { headers: { authorization: "expired" } };
        const res = makeRes();

        jwt.verify.mockImplementation(() => {
            const e = new Error("jwt expired");
            e.name = "TokenExpiredError";
            throw e;
        });

        await runChain([requireSignIn, isAdmin, testController], req, res);

        expect(res.statusCode).toBe(401);
        expect(String(res.body?.message || res.body)).toMatch(/token expired/i);
    });
});