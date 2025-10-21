/**
 * Integration tests for Auth routes using in-memory MongoDB and supertest.
 * connects to a test DB, seeds users, and exercises real Express routes on `app`.
 */

import request from "supertest";
import JWT from "jsonwebtoken";
import { connectToTestDb, resetTestDb, disconnectFromTestDb } from "../tests/utils/db.js";
import app from "../server.js";
import userModel from "../models/userModel.js";
import { hashPassword } from "../helpers/authHelper.js";

jest.setTimeout(30000);

const issueToken = (userId) =>
    JWT.sign({ _id: userId }, process.env.JWT_SECRET || "test-secret-key", {
        expiresIn: "1h",
    });

let adminUser;
let normalUser;
let adminToken;
let userToken;

beforeAll(async () => {
    await connectToTestDb("auth-integration-tests");
    await userModel.deleteMany({});
});

afterAll(async () => {
    await userModel.deleteMany({});
    await disconnectFromTestDb();
});

beforeEach(async () => {
    (await resetTestDb?.()) || (await userModel.deleteMany({}));

    const adminPass = "AdminPass123!";
    const userPass = "UserPass123!";

    adminUser = await userModel.create({
        name: "Admin User",
        email: "admin_test@example.com",
        password: await hashPassword(adminPass),
        phone: "555-0001",
        address: "1 Admin Way",
        answer: "blue",
        role: 1,
    });

    normalUser = await userModel.create({
        name: "Normal User",
        email: "user_test@example.com",
        password: await hashPassword(userPass),
        phone: "555-0002",
        address: "2 User Lane",
        answer: "red",
        role: 0,
    });

    adminToken = issueToken(adminUser._id);
    userToken = issueToken(normalUser._id);
});

afterEach(async () => {
    jest.clearAllMocks();
});

describe("Auth integration — protection and roles", () => {
    it("denies access without Authorization header", async () => {
        const res = await request(app).get("/api/v1/auth/test");
        expect(res.status).toBe(401);
        expect(String(res.body?.message || res.text)).toMatch(/authorization header required/i);
    });

    it("denies access with invalid token", async () => {
        const res = await request(app)
            .get("/api/v1/auth/test")
            .set("Authorization", "not-a-valid-token");
        expect(res.status).toBe(401);
        expect(String(res.body?.message || res.text)).toMatch(/invalid token|authentication failed/i);
    });

    it("allows admin to access protected test route", async () => {
        const res = await request(app)
            .get("/api/v1/auth/test")
            .set("Authorization", adminToken);
        expect(res.status).toBe(200);
        expect(String(res.text || res.body)).toMatch(/protected routes/i);
    });

    it("allows any authenticated user for /user-auth", async () => {
        const res = await request(app)
            .get("/api/v1/auth/user-auth")
            .set("Authorization", userToken);
        expect(res.status).toBe(200);
        expect(res.body?.ok).toBe(true);
    });

    it("returns 200 for admin on /admin-auth", async () => {
        const res = await request(app)
            .get("/api/v1/auth/admin-auth")
            .set("Authorization", adminToken);
        expect(res.status).toBe(200);
        expect(res.body?.ok).toBe(true);
    });

    it("returns 403 for non-admin on /admin-auth", async () => {
        const res = await request(app)
            .get("/api/v1/auth/admin-auth")
            .set("Authorization", userToken);
        expect(res.status).toBe(403);
        expect(String(res.body?.message || res.text)).toMatch(/insufficient|admin/i);
    });
});

describe("Auth integration — login flow", () => {
    it("logs in admin with correct credentials", async () => {
        const res = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: adminUser.email, password: "AdminPass123!" });

        expect(res.status).toBe(200);
        expect(res.body?.success).toBe(true);
        expect(typeof res.body?.token).toBe("string");
        expect(res.body?.user?.email).toBe(adminUser.email);
        expect(res.body?.user?.role).toBe(1);
    });

    it("rejects login with wrong password", async () => {
        const res = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: normalUser.email, password: "totallyWrong!" });

        expect([400, 401]).toContain(res.status);
        expect(res.body?.success).toBe(false);
    });
});
