import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { env } from 'cloudflare:workers';
import { digest } from '@/lib/passwords';
import { getChatGPTUser, type ChatGPTUser } from './chatgpt-auth';

export const sessionCookie = 'gramclimate_session';
export async function getEmailUser(): Promise<ChatGPTUser | null> {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token) || !env.DB) return null;
  const row = await env.DB.prepare(`SELECT a.id, a.email, a.name FROM email_sessions s
    JOIN email_accounts a ON a.id = s.account_id WHERE s.token_hash = ? AND s.expires_at > ?`)
    .bind(await digest(token), Date.now()).first<{id: string; email: string; name: string}>();
  return row ? { userId: row.id, email: row.email, fullName: row.name, displayName: row.name } : null;
}
export async function getAppUser() {
  return await getEmailUser() ?? await getChatGPTUser();
}
export async function requireAppUser() {
  const user = await getAppUser();
  if (!user) redirect('/login');
  return user;
}
