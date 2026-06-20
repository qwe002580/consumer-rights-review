# Admin Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protect the case administration pages and update API with a server-validated administrator login that remains valid for seven days.

**Architecture:** A focused authentication module will validate credentials and create HMAC-signed, expiring session tokens. Route handlers will create and clear an HttpOnly cookie, the admin route-group layout will redirect unauthenticated page requests, and the case update API will independently reject unauthenticated calls.

**Tech Stack:** Next.js 15 App Router, React 19, Node.js crypto, Vitest, signed cookies

---

## File Structure

- Create `lib/admin-auth.ts`: pure credential comparison, signed-token creation and verification, cookie constants.
- Create `lib/admin-request-auth.ts`: read and verify the admin cookie from API requests.
- Create `app/api/admin/login/route.ts`: validate credentials and set the seven-day session cookie.
- Create `app/api/admin/logout/route.ts`: clear the session cookie.
- Create `app/admin/login/page.tsx`: redirect authenticated users and render the login screen.
- Create `components/admin-login-form.tsx`: submit credentials and show a neutral error.
- Create `components/admin-session-bar.tsx`: show the backend label and logout control.
- Create `app/(admin)/layout.tsx`: enforce authentication for every admin page.
- Modify `app/api/cases/[id]/route.ts`: reject unauthenticated updates before reading or changing data.
- Modify `app/globals.css`: style login and admin session controls consistently with the current site.
- Create `tests/admin-auth.test.ts`: token, credential, expiry, and tamper coverage.
- Create `tests/admin-login-route.test.ts`: successful and failed login cookie behavior.
- Create `tests/admin-api-auth.test.ts`: unauthenticated case update rejection.
- Modify `tests/admin-pages.test.ts`: confirm login and protected-layout modules exist.

### Task 1: Signed Administrator Session

**Files:**
- Create: `lib/admin-auth.ts`
- Test: `tests/admin-auth.test.ts`

- [ ] **Step 1: Write failing authentication tests**

```ts
import { afterEach, describe, expect, it } from "vitest";
import {
  createAdminSessionToken,
  verifyAdminCredentials,
  verifyAdminSessionToken
} from "../lib/admin-auth";

describe("admin authentication", () => {
  afterEach(() => {
    delete process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_SESSION_SECRET;
  });

  it("accepts configured credentials without embedding them in client code", () => {
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD = "secret";
    expect(verifyAdminCredentials("admin", "secret")).toBe(true);
    expect(verifyAdminCredentials("admin", "wrong")).toBe(false);
  });

  it("accepts an unmodified token before its seven-day expiry", () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret-with-enough-entropy";
    const now = Date.UTC(2026, 5, 20);
    const token = createAdminSessionToken(now);
    expect(verifyAdminSessionToken(token, now + 1_000)).toBe(true);
  });

  it("rejects tampered and expired tokens", () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret-with-enough-entropy";
    const now = Date.UTC(2026, 5, 20);
    const token = createAdminSessionToken(now);
    expect(verifyAdminSessionToken(`${token}x`, now + 1_000)).toBe(false);
    expect(verifyAdminSessionToken(token, now + 7 * 24 * 60 * 60 * 1000 + 1)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx vitest run tests/admin-auth.test.ts`

Expected: FAIL because `lib/admin-auth.ts` does not exist.

- [ ] **Step 3: Implement the minimal signed-session module**

Create constants for `admin_session` and seven days. Hash both credential strings before `timingSafeEqual`, sign the token expiry with `createHmac("sha256", secret)`, and reject malformed, expired, tampered, or unconfigured sessions.

```ts
export const ADMIN_COOKIE_NAME = "admin_session";
export const ADMIN_SESSION_SECONDS = 7 * 24 * 60 * 60;

export function verifyAdminCredentials(username: string, password: string): boolean;
export function createAdminSessionToken(now?: number): string;
export function verifyAdminSessionToken(token: string | undefined, now?: number): boolean;
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npx vitest run tests/admin-auth.test.ts`

Expected: 3 tests pass.

- [ ] **Step 5: Commit the session module**

```bash
git add lib/admin-auth.ts tests/admin-auth.test.ts
git commit -m "Add signed admin sessions"
```

### Task 2: Login and Logout Endpoints

**Files:**
- Create: `app/api/admin/login/route.ts`
- Create: `app/api/admin/logout/route.ts`
- Test: `tests/admin-login-route.test.ts`

- [ ] **Step 1: Write failing route tests**

Test a correct JSON login request for status 200 and a `Set-Cookie` header containing `admin_session`, `HttpOnly`, `SameSite=lax`, and `Max-Age=604800`. Test incorrect credentials for status 401 without a session cookie. Test logout for a clearing cookie with `Max-Age=0`.

- [ ] **Step 2: Run the route test and verify RED**

Run: `npx vitest run tests/admin-login-route.test.ts`

Expected: FAIL because the login and logout route modules do not exist.

- [ ] **Step 3: Implement login and logout handlers**

The login handler must parse only string `username` and `password`, return `{ error: "INVALID_CREDENTIALS" }` for all failed logins, and set the signed cookie only on success. The logout handler must expire the same cookie. Cookie options must be `httpOnly: true`, `sameSite: "lax"`, `secure: process.env.NODE_ENV === "production"`, `path: "/"`, and seven-day `maxAge` for login.

- [ ] **Step 4: Run the route test and verify GREEN**

Run: `npx vitest run tests/admin-login-route.test.ts`

Expected: successful login, failed login, and logout tests pass.

- [ ] **Step 5: Commit the endpoint changes**

```bash
git add app/api/admin/login/route.ts app/api/admin/logout/route.ts tests/admin-login-route.test.ts
git commit -m "Add admin login endpoints"
```

### Task 3: Login Screen and Protected Admin Pages

**Files:**
- Create: `app/admin/login/page.tsx`
- Create: `components/admin-login-form.tsx`
- Create: `components/admin-session-bar.tsx`
- Create: `app/(admin)/layout.tsx`
- Modify: `app/globals.css`
- Modify: `tests/admin-pages.test.ts`

- [ ] **Step 1: Extend page-module tests and verify RED**

Assert that the login page, login form, session bar, and admin layout modules export renderable functions. Render the form and assert it contains labeled account and password fields, a submit button, and no configured password value.

Run: `npx vitest run tests/admin-pages.test.ts`

Expected: FAIL because the new page and components do not exist.

- [ ] **Step 2: Implement protected page flow**

The admin layout reads `ADMIN_COOKIE_NAME` with `await cookies()`, verifies it, and calls `redirect("/admin/login")` before rendering children when invalid. The login page performs the inverse redirect to `/cases` for a valid cookie. The client form posts JSON to `/api/admin/login`, shows `账号或密码不正确` for any failure, and navigates to `/cases` on success. The session bar posts to `/api/admin/logout` and navigates to `/admin/login`.

- [ ] **Step 3: Add focused responsive styling**

Add `.admin-login-shell`, `.admin-login-card`, `.admin-login-form`, `.login-error`, and `.admin-session-bar` styles using the current `--panel`, `--forest`, `--line`, and `--muted` variables. Keep the card centered and usable at 360px width, with visible keyboard focus states.

- [ ] **Step 4: Run page tests and verify GREEN**

Run: `npx vitest run tests/admin-pages.test.ts`

Expected: all admin page tests pass.

- [ ] **Step 5: Commit the page protection**

```bash
git add 'app/(admin)/layout.tsx' app/admin/login/page.tsx components/admin-login-form.tsx components/admin-session-bar.tsx app/globals.css tests/admin-pages.test.ts
git commit -m "Protect admin pages with login"
```

### Task 4: Protect Case Update API

**Files:**
- Create: `lib/admin-request-auth.ts`
- Modify: `app/api/cases/[id]/route.ts`
- Create: `tests/admin-api-auth.test.ts`

- [ ] **Step 1: Write the failing unauthorized update test**

Call `PATCH` with a request that has no admin cookie and assert status 401 with `{ error: "UNAUTHORIZED" }`. The assertion must occur without requiring a database record so it proves authentication runs before request mutation.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx vitest run tests/admin-api-auth.test.ts`

Expected: FAIL because the current route proceeds to validation/database handling.

- [ ] **Step 3: Implement request-cookie verification**

Parse the named cookie from `request.headers.get("cookie")`, verify it with `verifyAdminSessionToken`, and return 401 at the start of `PATCH` when invalid. Do not change the public analysis submission route.

- [ ] **Step 4: Run the focused and full test suites**

Run: `npx vitest run tests/admin-api-auth.test.ts`

Expected: unauthorized request test passes.

Run: `npm test`

Expected: all project tests pass.

- [ ] **Step 5: Commit API protection**

```bash
git add lib/admin-request-auth.ts 'app/api/cases/[id]/route.ts' tests/admin-api-auth.test.ts
git commit -m "Protect case updates with admin session"
```

### Task 5: Build, Deploy, and Verify

**Files:**
- Modify outside Git: Zeabur environment variables for the deployed service

- [ ] **Step 1: Run complete local verification**

Run: `npm test`

Expected: all tests pass with zero failures.

Run: `npm run lint`

Expected: no ESLint warnings or errors.

Run: `npm run build`

Expected: production build and standalone preparation complete successfully.

- [ ] **Step 2: Configure production secrets**

Set `ADMIN_USERNAME=admin`, set the user-provided password as `ADMIN_PASSWORD`, and generate a random 32-byte or longer value for `ADMIN_SESSION_SECRET` in Zeabur. Never print either secret in logs or commit them.

- [ ] **Step 3: Push and wait for Zeabur deployment**

Push the verified commits to `origin/main`. Confirm the newest Zeabur deployment reaches `运行中` and the persistent `/app/data` volume remains mounted.

- [ ] **Step 4: Verify the complete public flow**

In a clean browser session, verify `/cases` redirects to `/admin/login`, incorrect credentials stay on the login page with the neutral error, correct credentials open `/cases`, a case detail is protected, logout returns to login, and `/` plus `POST /api/analyze` remain publicly reachable. Check desktop and mobile-width layouts and confirm no browser console errors.

