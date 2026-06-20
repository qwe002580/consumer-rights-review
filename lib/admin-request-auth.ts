import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";

function getCookieValue(header: string | null, name: string) {
  if (!header) {
    return undefined;
  }

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = part.slice(0, separator).trim();
    if (key !== name) {
      continue;
    }

    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }

  return undefined;
}

export function isAdminRequestAuthenticated(request: Request) {
  const token = getCookieValue(request.headers.get("cookie"), ADMIN_COOKIE_NAME);
  return verifyAdminSessionToken(token);
}
