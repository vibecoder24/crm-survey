import { NextResponse } from 'next/server';

type Body = { username: string; password: string };

export async function POST(req: Request) {
  const { username, password } = (await req.json()) as Body;
  const ok =
    (!!process.env.ADMIN_USERNAME ? username === process.env.ADMIN_USERNAME : username === 'admin') &&
    (!!process.env.ADMIN_PASSWORD ? password === process.env.ADMIN_PASSWORD : password === 'change-me');
  if (!ok) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set('admin_auth', 'ok', { httpOnly: true, path: '/', maxAge: 60 * 60 * 8 });
  return res;
}


