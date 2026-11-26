import { hash, compare } from 'bcryptjs';
import { z } from 'zod';

const password = z.string().min(12, 'Use at least 12 characters for your password.')
  .refine(value => new TextEncoder().encode(value).length <= 72, 'Password must fit within 72 UTF-8 bytes.');
export const credentials = z.object({
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  password: z.string().min(1).max(128),
}).strict();
export const registration = credentials.extend({
  name: z.string().trim().min(1).max(80),
  password,
}).strict();
export const hashPassword = (value: string) => hash(value, 12);
export const verifyPassword = (value: string, encoded: string) => compare(value, encoded);
export async function digest(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}
export function newSessionToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
}
