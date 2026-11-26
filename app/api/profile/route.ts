import { getAppUser } from '@/app/account-auth';
import { getDb } from '@/db';
import { profiles } from '@/db/schema';
import { profileInput } from '@/lib/profile';
import { eq } from 'drizzle-orm';
export async function GET() {
  const user = await getAppUser();
  if (!user) return Response.json({ error: 'Please sign in.' }, { status: 401 });
  try {
    const rows = await getDb().select().from(profiles).where(eq(profiles.userId, user.userId)).limit(1);
    return Response.json(rows[0] ?? { displayName: user.displayName, organization: '', role: 'Researcher', bio: '' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Your profile could not be loaded. Please retry.' }, { status: 503 }); }
}
export async function PUT(request: Request) {
  const user = await getAppUser();
  if (!user) return Response.json({ error: 'Please sign in.' }, { status: 401 });
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) return Response.json({ error: 'Request origin rejected.' }, { status: 403 });
  let input;
  try { input = profileInput.safeParse(await request.json()); }
  catch { return Response.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  if (!input.success) return Response.json({ error: input.error.issues[0].message }, { status: 400 });
  try {
    const value = { ...input.data, updatedAt: new Date().toISOString() };
    await getDb().insert(profiles).values({ userId: user.userId, ...value }).onConflictDoUpdate({ target: profiles.userId, set: value });
    return Response.json(value, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Changes were not saved. Please try again.' }, { status: 503 }); }
}
