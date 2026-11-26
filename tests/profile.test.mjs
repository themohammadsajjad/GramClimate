import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { profileInput } from '../lib/profile.ts';
const records = new Map();
let user = null;
const fakeDb = {
 select: () => ({ from: () => ({ where: ({ id }) => ({ limit: async () => records.has(id) ? [records.get(id)] : [] }) }) }),
 insert: () => ({ values: value => ({ onConflictDoUpdate: async () => { records.set(value.userId, value); } }) }),
};
globalThis.profileRouteTest = { getUser: () => user, db: fakeDb, profileInput };
const source = readFileSync('app/api/profile/route.ts', 'utf8').replace(/^import .*;$/gm, '');
const prelude = `const { profileInput, db: database, getUser } = globalThis.profileRouteTest;
const getAppUser = async () => getUser();
const getDb = () => database;
const profiles = { userId: 'user_id' };
const eq = (column,id) => ({column,id});`;
const compiled = ts.transpileModule(prelude + source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { GET, PUT } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
const body = { displayName: 'Researcher A', organization: 'Test lab', role: 'Student', bio: 'Seasonal change' };
const request = (value, origin = 'https://workspace.test') => new Request('https://workspace.test/api/profile', { method: 'PUT', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
test('profile rejects anonymous reads and writes', async () => {
 user = null; assert.equal((await GET()).status, 401); assert.equal((await PUT(request(body))).status,401);
});
test('profile persists by authenticated identity and isolates another account', async () => {
 user = {userId:'a',displayName:'A'}; assert.equal((await PUT(request(body))).status,200);
 assert.equal((await (await GET()).json()).bio,body.bio);
 user = {userId:'b',displayName:'B'}; assert.equal((await (await GET()).json()).displayName,'B');
 assert.equal((await PUT(request({...body,userId:'a'}))).status,400);
 assert.equal(records.get('a').displayName,'Researcher A');
});
test('profile rejects cross-origin writes and malformed input', async () => {
 user = {userId:'a',displayName:'A'};
 assert.equal((await PUT(request(body,'https://other.test'))).status,403);
 assert.equal((await PUT(request({...body,displayName:' '}))).status,400);
 assert.equal(profileInput.safeParse({...body,bio:'a'.repeat(501)}).success,false);
});
