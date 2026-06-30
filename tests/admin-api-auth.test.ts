import { afterEach, describe, expect, it } from "vitest";
import { PATCH } from "../app/api/cases/[id]/route";
import { createAdminSessionToken } from "../lib/admin-auth";
import { isAdminRequestAuthenticated } from "../lib/admin-request-auth";

describe("admin case API authentication", () => {
  afterEach(() => {
    delete process.env.ADMIN_SESSION_SECRET;
  });

  it("rejects an unauthenticated update before touching case data", async () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret-with-enough-entropy";
    const response = await PATCH(
      new Request("http://localhost/api/cases/missing-case", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "reviewed", operatorNotes: "已复核" })
      }),
      { params: Promise.resolve({ id: "missing-case" }) }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "UNAUTHORIZED" });
  });

  it("accepts a request carrying a valid signed session cookie", () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret-with-enough-entropy";
    const token = createAdminSessionToken();
    const request = new Request("http://localhost/api/cases/case-1", {
      headers: { cookie: `other=value; admin_session=${token}` }
    });

    expect(isAdminRequestAuthenticated(request)).toBe(true);
  });

  it("returns a controlled 400 response for malformed authenticated JSON", async () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret-with-enough-entropy";
    const token = createAdminSessionToken();
    const response = await PATCH(
      new Request("http://localhost/api/cases/case-1", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: `admin_session=${token}`
        },
        body: "{"
      }),
      { params: Promise.resolve({ id: "case-1" }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "INVALID_CASE_UPDATE" });
  });
});
