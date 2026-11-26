import { env } from 'cloudflare:workers';
import { cookies } from 'next/headers';
import { credentials, registration, hashPassword, verifyPassword, digest, newSessionToken } from '@/lib/passwords';
import { sessionCookie } from '@/app/account-auth';

const sessionLifetime = 24 * 60 * 60 * 1000;
const error = (message: string, status: number) => Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });

async function throttle(key: string, maximum: number) {
  const now = Date.now();
  const row = await env.DB!.prepare(`INSERT INTO auth_limits (key, attempts, expires_at) VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET attempts = CASE WHEN expires_at <= ? THEN 1 ELSE attempts + 1 END,
    expires_at = CASE WHEN expires_at <= ? THEN excluded.expires_at ELSE expires_at END RETURNING attempts`)
    .bind(await digest(key), now + 15 * 60 * 1000, now, now).first<{ attempts: number }>();
  return !!row && row.attempts <= maximum;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (request.headers.get('origin') !== url.origin) return error('Request origin rejected.', 403);
  const action = url.pathname.split('/').pop();
  if (!['login', 'register', 'logout'].includes(action ?? '')) return error('Unknown action.', 404);
  if (!env.DB) return error('Account storage is unavailable. Please try again later.', 503);
  try {
    const jar = await cookies();
    const previous = jar.get(sessionCookie)?.value;
    if (action === 'logout') {
      if (previous) await env.DB.prepare('DELETE FROM email_sessions WHERE token_hash = ?').bind(await digest(previous)).run();
      jar.set(sessionCookie, '', { httpOnly: true, secure: url.protocol === 'https:', sameSite: 'lax', path: '/', maxAge: 0 });
      return new Response(null, { status: 303, headers: { Location: '/signout-with-chatgpt?return_to=%2Flogin', 'Cache-Control': 'no-store' } });
    }
    if (Number(request.headers.get('content-length') ?? 0) > 4096) return error('Request is too large.', 413);
    const raw = await request.text();
    if (raw.length > 4096) return error('Request is too large.', 413);
    let body;
    try { body = JSON.parse(raw); } catch { return error('Invalid request.', 400); }
    const parsed = (action === 'register' ? registration : credentials).safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0].message, 400);
    const { email, password } = parsed.data;
    const ip = request.headers.get('cf-connecting-ip') ?? 'local-development';
    if (!await throttle('ip:' + ip, 30) || !await throttle('email:' + email, 10)) {
      return error('Too many attempts. Please wait 15 minutes and try again.', 429);
    }
    let account = await env.DB.prepare('SELECT id, password_hash FROM email_accounts WHERE email = ?')
      .bind(email).first<{ id: string; password_hash: string }>();
    if (action === 'register') {
      // Always hash before returning, including when the address already exists.
      const encoded = await hashPassword(password);
      if (account) return error('Unable to register with these details. Try signing in instead.', 400);
      const id = 'email:' + crypto.randomUUID();
      const name = registration.parse(body).name;
      const inserted = await env.DB.prepare('INSERT OR IGNORE INTO email_accounts (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(id, email, name, encoded, Date.now()).run();
      if (!inserted.meta.changes) return error('Unable to register with these details. Try signing in instead.', 400);
      account = { id, password_hash: encoded };
    } else {
      // Unknown accounts still perform a password comparison.
      const dummyHash = '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW';
      const matches = await verifyPassword(password, account?.password_hash ?? dummyHash);
      if (!account || !matches) return error('Email or password is incorrect.', 401);
    }
    const token = newSessionToken();
    if (previous) await env.DB.prepare('DELETE FROM email_sessions WHERE token_hash = ?').bind(await digest(previous)).run();
    await env.DB.prepare('DELETE FROM email_sessions WHERE expires_at <= ?').bind(Date.now()).run();
    await env.DB.prepare('DELETE FROM auth_limits WHERE expires_at <= ?').bind(Date.now()).run();
    await env.DB.prepare('INSERT INTO email_sessions (token_hash, account_id, expires_at) VALUES (?, ?, ?)')
      .bind(await digest(token), account!.id, Date.now() + sessionLifetime).run();
    jar.set(sessionCookie, token, { httpOnly: true, secure: url.protocol === 'https:', sameSite: 'lax', path: '/', maxAge: sessionLifetime / 1000 });
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return error('We could not complete this request. Please try again.', 503);
  }
}
