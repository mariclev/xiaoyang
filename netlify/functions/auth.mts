import type { Config } from "@netlify/functions";
import { createSession, deleteSession, getAdmin, ownerEmail, verifyPassword } from "./_shared/auth.mts";
import { json, methodNotAllowed, readJson } from "./_shared/http.mts";

export default async function handler(req: Request) {
  try {
    if (req.method === "GET") {
      const admin = await getAdmin(req);
      return json({ authenticated: Boolean(admin), email: admin?.email || null });
    }
    if (req.method === "POST") {
      const body = await readJson<{ email?: string; password?: string }>(req);
      const email = String(body.email || "").trim().toLowerCase();
      if (email !== ownerEmail() || !verifyPassword(String(body.password || ""))) {
        return json({ error: "邮箱或密码错误" }, 401);
      }
      const session = await createSession(email);
      return json({ authenticated: true }, 200, { "set-cookie": session.cookie });
    }
    if (req.method === "DELETE") {
      return json({ authenticated: false }, 200, { "set-cookie": await deleteSession(req) });
    }
    return methodNotAllowed(["GET", "POST", "DELETE"]);
  } catch (error) {
    const status = (error as any).status || 500;
    return json({ error: status === 401 ? "未登录" : "服务器错误" }, status);
  }
}

export const config: Config = { path: "/api/admin/session" };
