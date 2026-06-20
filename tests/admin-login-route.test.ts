import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as login } from "../app/api/admin/login/route";
import { POST as logout } from "../app/api/admin/logout/route";

describe("admin login routes", () => {
  beforeEach(() => {
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD = "secret";
    process.env.ADMIN_SESSION_SECRET = "test-secret-with-enough-entropy";
  });

  afterEach(() => {
    delete process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_SESSION_SECRET;
  });

  it("sets a protected seven-day cookie for valid credentials", async () => {
    const response = await login(
      new Request("http://localhost/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "secret" })
      })
    );
    const cookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(200);
    expect(cookie).toContain("admin_session=");
    expect(cookie).toContain("Max-Age=604800");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=lax");
  });

  it("rejects invalid or malformed credentials without setting a cookie", async () => {
    const invalidResponse = await login(
      new Request("http://localhost/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "wrong" })
      })
    );
    const malformedResponse = await login(
      new Request("http://localhost/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not-json"
      })
    );

    expect(invalidResponse.status).toBe(401);
    await expect(invalidResponse.json()).resolves.toEqual({ error: "INVALID_CREDENTIALS" });
    expect(invalidResponse.headers.get("set-cookie")).toBeNull();
    expect(malformedResponse.status).toBe(401);
  });

  it("clears the session cookie on logout", async () => {
    const response = await logout();
    const cookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(200);
    expect(cookie).toContain("admin_session=");
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("HttpOnly");
  });
});
