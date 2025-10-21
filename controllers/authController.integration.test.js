
const BASE_URL = 'http://localhost:6060';
const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = "Password";
const NONADMIN_EMAIL = "non_admin@gmail.com";
const NONADMIN_PASSWORD = "Password";

async function http(method, path, { token, body } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = token;
    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    const text = await res.text();
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text; // some endpoints return a plain string
    }
    return { status: res.status, data };
}

async function login(email, password) {
    return http('POST', '/api/v1/auth/login', { body: { email, password } });
}

describe('Auth (live) — unauthenticated and invalid token', () => {
    test('GET /api/v1/auth/test → 401 when Authorization header missing', async () => {
        const res = await http('GET', '/api/v1/auth/test');
        expect(res.status).toBe(401);
        expect(String(res.data?.message || res.data)).toMatch(/authorization header required/i);
    });

    test('GET /api/v1/auth/test → 401 with invalid token', async () => {
        const res = await http('GET', '/api/v1/auth/test', { token: 'not-a-real-token' });
        expect(res.status).toBe(401);
        expect(String(res.data?.message || res.data)).toMatch(/invalid token|authentication failed/i);
    });
});

const haveAdminCreds = Boolean(ADMIN_EMAIL && ADMIN_PASSWORD);
const haveUserCreds = Boolean(NONADMIN_EMAIL && NONADMIN_PASSWORD);

(haveAdminCreds ? describe : describe.skip)('Auth (live) — admin happy paths', () => {
    let adminToken;

    beforeAll(async () => {
        const res = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
        if (res.status !== 200 || !res.data?.token) {
            throw new Error(`Admin login failed: ${res.status} ${JSON.stringify(res.data)}`);
        }
        adminToken = res.data.token;
    });

    test('login returns token and user (admin)', async () => {
        const res = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
        expect(res.status).toBe(200);
        expect(res.data?.success).toBe(true);
        expect(typeof res.data?.token).toBe('string');
        expect(res.data?.user?.email).toBe(ADMIN_EMAIL);
        expect(res.data?.user?.role).toBe(1);
    });

    test('GET /api/v1/auth/user-auth → 200 with token', async () => {
        const res = await http('GET', '/api/v1/auth/user-auth', { token: adminToken });
        expect(res.status).toBe(200);
        expect(res.data?.ok).toBe(true);
    });

    test('GET /api/v1/auth/admin-auth → 200 for admin', async () => {
        const res = await http('GET', '/api/v1/auth/admin-auth', { token: adminToken });
        expect(res.status).toBe(200);
        expect(res.data?.ok).toBe(true);
    });

    test('GET /api/v1/auth/test → 200 and Protected Routes', async () => {
        const res = await http('GET', '/api/v1/auth/test', { token: adminToken });
        expect(res.status).toBe(200);
        expect(String(res.data)).toMatch(/protected routes/i);
    });
});

(haveUserCreds ? describe : describe.skip)('Auth (live) — non-admin forbidden on admin route', () => {
    let userToken;

    beforeAll(async () => {
        const res = await login(NONADMIN_EMAIL, NONADMIN_PASSWORD);
        if (res.status !== 200 || !res.data?.token) {
            throw new Error(`User login failed: ${res.status} ${JSON.stringify(res.data)}`);
        }
        userToken = res.data.token;
    });

    test('GET /api/v1/auth/admin-auth → 403 for non-admin', async () => {
        const res = await http('GET', '/api/v1/auth/admin-auth', { token: userToken });
        expect(res.status).toBe(403);
        expect(String(res.data?.message || res.data)).toMatch(/insufficient|admin/i);
    });
});
