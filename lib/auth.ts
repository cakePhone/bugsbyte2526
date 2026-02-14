/**
 * Auth Utilities — JWT + Cookie Helpers
 * Geisha Gains • Coffee Driven Development
 *
 * Edge-compatible JWT via `jose`. Tokens stored in httpOnly cookies.
 */

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "geisha-gains-default-secret-change-me",
);

const TOKEN_NAME = "geisha_token";
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface TokenPayload {
  sub: string; // user id
  email: string;
}

/** Sign a new JWT for the given user */
export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_MAX_AGE}s`)
    .sign(JWT_SECRET);
}

/** Verify & decode a JWT. Returns null on failure. */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

/** Read token from cookies and verify */
export async function getSession(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Cookie config for setting/clearing the token */
export function tokenCookieOptions(token: string) {
  return {
    name: TOKEN_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: TOKEN_MAX_AGE,
  };
}

export function clearTokenCookie() {
  return {
    name: TOKEN_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}
