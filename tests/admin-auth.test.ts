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

  it("accepts only the configured credentials", () => {
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD = "secret";

    expect(verifyAdminCredentials("admin", "secret")).toBe(true);
    expect(verifyAdminCredentials("admin", "wrong")).toBe(false);
    expect(verifyAdminCredentials("other", "secret")).toBe(false);
  });

  it("rejects credentials when server configuration is missing", () => {
    expect(verifyAdminCredentials("admin", "secret")).toBe(false);
  });

  it("accepts an unmodified token before its seven-day expiry", () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret-with-enough-entropy";
    const now = Date.UTC(2026, 5, 20);
    const token = createAdminSessionToken(now);

    expect(verifyAdminSessionToken(token, now + 1_000)).toBe(true);
  });

  it("rejects tampered, malformed, expired, and unconfigured tokens", () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret-with-enough-entropy";
    const now = Date.UTC(2026, 5, 20);
    const token = createAdminSessionToken(now);

    expect(verifyAdminSessionToken(`${token}x`, now + 1_000)).toBe(false);
    expect(verifyAdminSessionToken("invalid", now + 1_000)).toBe(false);
    expect(verifyAdminSessionToken(token, now + 7 * 24 * 60 * 60 * 1000 + 1)).toBe(false);

    delete process.env.ADMIN_SESSION_SECRET;
    expect(verifyAdminSessionToken(token, now + 1_000)).toBe(false);
  });
});
