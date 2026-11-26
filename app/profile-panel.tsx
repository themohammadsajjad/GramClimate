 'use client';
import { useEffect, useState } from 'react';
import { UserRound, ShieldCheck, Save, LogOut, RefreshCw } from 'lucide-react';
import type { ChatGPTUser } from './chatgpt-auth';
import type { Profile } from '@/lib/profile';
export default function ProfilePanel({ user, signOutUrl, onNameChange }: { user: ChatGPTUser; signOutUrl: string; onNameChange: (name: string) => void }) {
  const [profile, setProfile] = useState<Profile>({ displayName: user.displayName, organization: '', role: 'Researcher', bio: '' });
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  async function load() {
    setLoading(true); setError('');
    try { const response = await fetch('/api/profile', { cache: 'no-store' }); const value = await response.json() as Profile & { error?: string };  if (!response.ok) throw Error(value.error); setProfile({ displayName: value.displayName, organization: value.organization, role: value.role, bio: value.bio }); onNameChange(value.displayName); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load your profile.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try { const response = await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile) }); const value = await response.json() as Profile & { error?: string };  if (!response.ok) throw Error(value.error); onNameChange(value.displayName); setMessage('Your profile has been saved.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save changes.'); }
    finally { setSaving(false); }
  }
  return <div className="profile-grid"><section className="panel profile-identity"><div className="profile-avatar"><UserRound size={36}/></div><h2>{profile.displayName}</h2><p>{user.email}</p><span className="tiny-tag"><ShieldCheck size={14}/> {user.userId.startsWith('email:') ? 'Email account · unverified' : 'ChatGPT account'}</span><hr/><p>Your profile belongs to your signed-in account. Research datasets and experiment runs remain in the current session; export them before leaving.</p><form action="/api/account/logout" method="post" target="_top"><button className="button" type="submit"><LogOut size={16}/>Sign out</button></form></section><form className="panel profile-form" onSubmit={save}><div className="panel-heading"><div><h2>Make this workspace yours</h2><p>Your research profile</p></div></div>{loading ? <p role="status">Loading your profile…</p> : <><label>Display name<input required maxLength={80} value={profile.displayName} onChange={e => setProfile({ ...profile, displayName: e.target.value })}/></label><div className="profile-fields"><label>Organization<input maxLength={120} placeholder="University or research team" value={profile.organization} onChange={e => setProfile({ ...profile, organization: e.target.value })}/></label><label>Your role<select value={profile.role} onChange={e => setProfile({ ...profile, role: e.target.value as Profile['role'] })}>{['Researcher', 'Student', 'Educator', 'Climate analyst'].map(role => <option key={role}>{role}</option>)}</select></label></div><label>Research interests<textarea rows={4} maxLength={500} placeholder="What would you like to understand about local climate?" value={profile.bio} onChange={e => setProfile({ ...profile, bio: e.target.value })}/><small>{profile.bio.length}/500 characters</small></label><label>Account email<input value={user.email} readOnly/><small>Your account email cannot be changed here.</small></label><div className="profile-save"><button className="button primary" disabled={saving}><Save size={16}/>{saving ? 'Saving…' : 'Save profile'}</button><span role="status">{message}</span></div></>}{error && <div className="profile-error" role="alert">{error}<button type="button" className="button" onClick={load}><RefreshCw size={15}/>Retry loading</button></div>}</form></div>;
}
