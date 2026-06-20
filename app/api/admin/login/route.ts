import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_SECONDS,
  createAdminSessionToken,
  verifyAdminCredentials
} from "@/lib/admin-auth";

const invalidCredentialsResponse = () =>
  NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });

export async function POST(request: Request) {
  let credentials: unknown;

  try {
    credentials = await request.json();
  } catch {
    return invalidCredentialsResponse();
  }

  if (!credentials || typeof credentials !== "object") {
    return invalidCredentialsResponse();
  }

  const { username, password } = credentials as Record<string, unknown>;
  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    !verifyAdminCredentials(username, password)
  ) {
    return invalidCredentialsResponse();
  }

  try {
    const response = NextResponse.json({ ok: true }, { status: 200 });
    response.cookies.set(ADMIN_COOKIE_NAME, createAdminSessionToken(), {
      httpOnly: true,
      maxAge: ADMIN_SESSION_SECONDS,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });
    return response;
  } catch (error) {
    console.error("Admin login is not configured", error);
    return NextResponse.json({ error: "LOGIN_UNAVAILABLE" }, { status: 500 });
  }
}
