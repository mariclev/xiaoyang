export function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

export async function readJson<T>(req: Request): Promise<T> {
  const type = req.headers.get("content-type") || "";
  if (!type.includes("application/json")) {
    throw new Error("请求内容必须是 JSON");
  }
  return await req.json() as T;
}

export function methodNotAllowed(allowed: string[]) {
  return json({ error: "Method not allowed" }, 405, { allow: allowed.join(", ") });
}

export function cleanText(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}
