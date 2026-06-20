import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE_NAME = "admin_session";
export const ADMIN_SESSION_SECONDS = 7 * 24 * 60 * 60;

function safeEqual(left: string, right: string) {
  const leftDigest = createHash("sha256").update(left).digest();
  const rightDigest = createHash("sha256").update(right).digest();

  return timingSafeEqual(leftDigest, rightDigest);
}

function signExpiry(expiry: string, secret: string) {
  return createHmac("sha256", secret).update(expiry).digest("base64url");
}

export function verifyAdminCredentials(username: string, password: string) {
  const configuredUsername = process.env.ADMIN_USERNAME;
  const configuredPassword = process.env.ADMIN_PASSWORD;

  if (!configuredUsername || !configuredPassword) {
    return false;
  }

  return safeEqual(username, configuredUsername) && safeEqual(password, configuredPassword);
}

export function createAdminSessionToken(now = Date.now()) {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not configured");
  }

  const expiry = String(now + ADMIN_SESSION_SECONDS * 1000);
  return `${expiry}.${signExpiry(expiry, secret)}`;
}

export function verifyAdminSessionToken(token: string | undefined, now = Date.now()) {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret || !token) {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return false;
  }

  const [expiry, signature] = parts;
  if (!/^\d+$/.test(expiry) || Number(expiry) <= now) {
    return false;
  }

  return safeEqual(signature, signExpiry(expiry, secret));
}
