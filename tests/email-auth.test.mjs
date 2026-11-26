import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as passwords from '../lib/passwords.ts';

const sqlite = new DatabaseSync(':memory:');
sqlite.exec(readFileSync('drizzle/0001_yummy_morbius.sql', 'utf8'));
const jar = new Map();
const cookieOptions = new Map();
const cookies = async () => ({
  get: name => jar.has(name) ? { value: jar.get(name) } : undefined,
  set: (name, value, options) => { jar.set(name, value); cookieOptions.set(name, options); },
});
const env = { DB: { prepare(sql) {
  return { bind(...args) { return {
    first: async () => sqlite.prepare(sql).get(...args) ?? null,
    run: async () => ({ meta: { changes: sqlite.prepare(sql).run(...args).changes } }),
  }; } };
} } };
globalThis.emailAuthTest = { ...passwords, env, cookies };
async function loadRoute(path, prelude) {
  const source = readFileSync(path, 'utf8').replace(/^import .*;$/gm, '');
  const code = ts.transpileModule(prelude + source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
}
const { POST } = await loadRoute('app/api/account/[action]/route.ts', `
const {env,cookies,credentials,registration,hashPassword,verifyPassword,digest,newSessionToken} = globalThis.emailAuthTest;
const sessionCookie = 'gramclimate_session';`);
const { getEmailUser } = await loadRoute('app/account-auth.ts', `
const {env,cookies,digest} = globalThis.emailAuthTest;
const getChatGPTUser = async () => null;
const redirect = () => { throw Error('redirect'); };`);
const call = (action, body, origin = 'https://gram.test') => POST(new Request('https://gram.test/api/account/' + action, {
  method: 'POST', headers: { origin, 'Content-Type': 'application/json', 'cf-connecting-ip': '192.0.2.1' }, body: JSON.stringify(body),
}));
const details = { email: 'Researcher@Example.com', name: 'Researcher', password: 'Rainfall-study-2026!' };

test('registration stores hashes, sets protected cookies, and resolves the account', async () => {
  const response = await call('register', details);
  assert.equal(response.status, 200, await response.text());
  const row = sqlite.prepare('SELECT * FROM email_accounts').get();
  assert.equal(row.email, 'researcher@example.com');
  assert.notEqual(row.password_hash, details.password);
  assert.ok(row.password_hash.startsWith('$2b$12$'));
  const token = jar.get('gramclimate_session');
  assert.equal(sqlite.prepare('SELECT token_hash FROM email_sessions').get().token_hash, await passwords.digest(token));
  assert.equal(cookieOptions.get('gramclimate_session').httpOnly, true);
  assert.equal(cookieOptions.get('gramclimate_session').secure, true);
  assert.equal((await getEmailUser()).email, row.email);
});
test('login rejects wrong credentials and rotates the previous session', async () => {
  assert.equal((await call('login', { email: details.email, password: 'wrong-password' })).status, 401);
  const previous = jar.get('gramclimate_session');
  assert.equal((await call('login', { email: details.email, password: details.password })).status, 200);
  assert.notEqual(jar.get('gramclimate_session'), previous);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM email_sessions WHERE token_hash = ?').get(await passwords.digest(previous)).n, 0);
});
test('expired and revoked sessions cannot authenticate', async () => {
  sqlite.prepare('UPDATE email_sessions SET expires_at = 0').run();
  assert.equal(await getEmailUser(), null);
  assert.equal((await call('login', { email: details.email, password: details.password })).status, 200);
  assert.equal((await call('logout', {})).status, 303);
  assert.equal(await getEmailUser(), null);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM email_sessions').get().n, 0);
});
test('auth rejects cross-origin requests, duplicate accounts, and invalid registration', async () => {
  assert.equal((await call('register', details, 'https://elsewhere.test')).status, 403);
  assert.equal((await call('register', details)).status, 400);
  assert.equal((await call('register', { ...details, password: 'short' })).status, 400);
  assert.equal(passwords.registration.safeParse({ ...details, password: '😀'.repeat(30) }).success, false);
});
test('persistent attempt limit blocks further password checks', async () => {
  const key = await passwords.digest('email:researcher@example.com');
  sqlite.prepare('UPDATE auth_limits SET attempts = 10 WHERE key = ?').run(key);
  assert.equal((await call('login', { email: details.email, password: details.password })).status, 429);
});
