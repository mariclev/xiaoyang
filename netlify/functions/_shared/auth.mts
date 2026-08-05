import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { getDatabase } from "@netlify/database";

const COOKIE_NAME = "xy_admin";
const SESSION_DAYS = 7;
const OWNER_EMAIL = "2992764344@qq.com";
const ADMIN_HASH = [
  "pbkdf2_sha256",
  "210000",
  "4491986f737b3276b2b14efddd5500ac",
  "7ADP5a2REWXAgyiUHTXaVBhqH8Bpz1_tGj8jAwSllJY",
].join("$");

export function ownerEmail() {
  return OWNER_EMAIL;
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - normalized.length % 4) % 4);
  return Buffer.from(normalized + padding, "base64");
}

export function verifyPassword(password: string) {
  const [algorithm, iterationText, salt, expectedText] = ADMIN_HASH.split("$");
  if (algorithm !== "pbkdf2_sha256" || !iterationText || !salt || !expectedText) return false;
  const iterations = Number(iterationText);
  if (!Number.isSafeInteger(iterations) || iterations < 100000) return false;
  const expected = decodeBase64Url(expectedText);
  const actual = pbkdf2Sync(password, salt, iterations, expected.length, "sha256");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function cookieToken(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  for (const part of cookie.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE_NAME) return decodeURIComponent(rest.join("="));
  }
  return "";
}

export async function createSession(email: string) {
  const token = randomBytes(32).toString("base64url");
  const hash = tokenHash(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  const db = getDatabase();
  await db.sql`DELETE FROM admin_sessions WHERE expires_at <= NOW()`;
  await db.sql`
    INSERT INTO admin_sessions (token_hash, email, expires_at)
    VALUES (${hash}, ${email}, ${expiresAt.toISOString()})
  `;
  return {
    expiresAt,
    cookie: `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}`,
  };
}

export async function getAdmin(req: Request) {
  const token = cookieToken(req);
  if (!token) return null;
  const db = getDatabase();
  const rows = await db.sql<{ email: string }>`
    SELECT email FROM admin_sessions
    WHERE token_hash = ${tokenHash(token)} AND expires_at > NOW()
    LIMIT 1
  `;
  const row = rows[0];
  return row ? { email: String(row.email) } : null;
}

export async function requireAdmin(req: Request) {
  const admin = await getAdmin(req);
  if (!admin) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  return admin;
}

export async function deleteSession(req: Request) {
  const token = cookieToken(req);
  if (token) {
    const db = getDatabase();
    await db.sql`DELETE FROM admin_sessions WHERE token_hash = ${tokenHash(token)}`;
  }
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}
