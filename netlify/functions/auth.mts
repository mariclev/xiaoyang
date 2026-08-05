import { createSession, deleteSession, getAdmin, ownerEmail, verifyPassword } from './_shared/auth.mts';
import { json } from './_shared/http.mts';

export default async (req: Request) => {
  if (req.method === 'GET') return json({ authenticated: !!(await getAdmin(req)) });
  if (req.method === 'DELETE') return new Response(null, { status: 204, headers: { 'Set-Cookie': await deleteSession(req) } });
  if (req.method !== 'POST') return json({ message: 'Method not allowed' }, 405);

  const body = await req.json();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (email !== ownerEmail() || !verifyPassword(password)) return json({ message: '账号或密码错误' }, 401);

  const session = await createSession(email);
  return json({ authenticated: true }, 200, { 'Set-Cookie': session.cookie });
};

export const config = { path: '/api/admin/session' };
