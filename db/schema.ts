import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const profiles = sqliteTable('profiles', {
  userId: text('user_id').primaryKey(),
  displayName: text('display_name').notNull(),
  organization: text('organization').notNull().default(''),
  role: text('role').notNull().default('Researcher'),
  bio: text('bio').notNull().default(''),
  updatedAt: text('updated_at').notNull(),
});

export const emailAccounts = sqliteTable('email_accounts', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at').notNull(),
});
export const emailSessions = sqliteTable('email_sessions', {
  tokenHash: text('token_hash').primaryKey(),
  accountId: text('account_id').notNull().references(() => emailAccounts.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at').notNull(),
});
export const authLimits = sqliteTable('auth_limits', {
  key: text('key').primaryKey(),
  attempts: integer('attempts').notNull(),
  expiresAt: integer('expires_at').notNull(),
});
