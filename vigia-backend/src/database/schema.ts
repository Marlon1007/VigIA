import { pgTable, varchar, integer, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const userRole = pgEnum('user_role', ['admin', 'operator', 'auditor']);

export const users = pgTable('users', {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: varchar({ length: 100 }).notNull(),
  email: varchar({ length: 150 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRole().notNull().default('operator'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});