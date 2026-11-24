import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  pgView,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';

export const userRole = pgEnum('user_role', ['admin', 'operator', 'auditor']);
export const videoSourceType = pgEnum('video_source_type', ['webcam', 'rtsp']);
export const hardwareConnectionType = pgEnum('hardware_connection_type', ['serial', 'bluetooth']);
export const connectionStatus = pgEnum('connection_status', ['online', 'reconnecting', 'disconnected']);
export const severityLevel = pgEnum('severity_level', ['low', 'medium', 'high', 'critical']);
export const reviewStatus = pgEnum('review_status', ['pending', 'confirmed', 'false_positive', 'system_test']);
export const evidenceType = pgEnum('evidence_type', ['image', 'video', 'audio']);
export const contactType = pgEnum('contact_type', ['police', 'medical_brigade', 'executive', 'guard', 'other']);
export const notificationStatus = pgEnum('notification_status', ['sent', 'failed']);

export const users = pgTable('users', {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: varchar({ length: 100 }).notNull(),
  email: varchar({ length: 150 }).notNull().unique('users_email_key'),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRole().notNull().default('operator'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const termsAndConditions = pgTable('terms_and_conditions', {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  version: varchar({ length: 20 }).notNull().unique('terms_and_conditions_version_key'),
  title: varchar({ length: 150 }).notNull(),
  content: text().notNull(),
  isCurrent: boolean('is_current').notNull().default(false),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const termsAcceptances = pgTable('terms_acceptances', {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  userId: integer('user_id').notNull(),
  termsId: integer('terms_id').notNull(),
  accepted: boolean().notNull().default(true),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('uq_terms_acceptances_user_terms').on(table.userId, table.termsId),
  foreignKey({
    name: 'fk_terms_acceptances_user',
    columns: [table.userId],
    foreignColumns: [users.id],
  }).onDelete('cascade'),
  foreignKey({
    name: 'fk_terms_acceptances_terms',
    columns: [table.termsId],
    foreignColumns: [termsAndConditions.id],
  }).onDelete('restrict'),
]);

export const zones = pgTable('zones', {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: varchar({ length: 100 }).notNull().unique('zones_name_key'),
  description: varchar({ length: 255 }),
  isActive: boolean('is_active').notNull().default(true),
});

export const cameras = pgTable('cameras', {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  zoneId: integer('zone_id').notNull(),
  name: varchar({ length: 100 }).notNull().unique('cameras_name_key'),
  sourceType: videoSourceType('source_type').notNull(),
  source: varchar({ length: 500 }).notNull(),
  fps: integer().notNull().default(15),
  capturesAudio: boolean('captures_audio').notNull().default(false),
  status: connectionStatus().notNull().default('disconnected'),
  isActive: boolean('is_active').notNull().default(true),
}, (table) => [
  check('chk_cameras_fps', sql`${table.fps} BETWEEN 15 AND 30`),
  foreignKey({
    name: 'fk_cameras_zone',
    columns: [table.zoneId],
    foreignColumns: [zones.id],
  }).onDelete('restrict'),
]);

export const sirens = pgTable('sirens', {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  zoneId: integer('zone_id'),
  name: varchar({ length: 100 }).notNull().unique('sirens_name_key'),
  connectionType: hardwareConnectionType('connection_type').notNull(),
  port: varchar({ length: 50 }),
  bluetoothAddress: varchar('bluetooth_address', { length: 17 }),
  status: connectionStatus().notNull().default('disconnected'),
  isActive: boolean('is_active').notNull().default(true),
}, (table) => [
  foreignKey({
    name: 'fk_sirens_zone',
    columns: [table.zoneId],
    foreignColumns: [zones.id],
  }).onDelete('set null'),
]);

export const incidentCategories = pgTable('incident_categories', {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  code: varchar({ length: 40 }).notNull().unique('incident_categories_code_key'),
  name: varchar({ length: 100 }).notNull(),
  severityLevel: severityLevel('severity_level').notNull(),
  confidenceThreshold: numeric('confidence_threshold', { precision: 3, scale: 2 }).notNull().default('0.75'),
  persistenceMs: integer('persistence_ms').notNull().default(1000),
  isActive: boolean('is_active').notNull().default(true),
}, (table) => [
  check('chk_categories_threshold', sql`${table.confidenceThreshold} BETWEEN 0 AND 1`),
]);

export const incidents = pgTable('incidents', {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  cameraId: integer('camera_id').notNull(),
  categoryId: integer('category_id').notNull(),
  confidence: numeric({ precision: 5, scale: 4 }).notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  alarmActive: boolean('alarm_active').notNull().default(true),
  silencedBy: integer('silenced_by'),
  silencedAt: timestamp('silenced_at', { withTimezone: true }),
  reviewStatus: reviewStatus('review_status').notNull().default('pending'),
  reviewedBy: integer('reviewed_by'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
}, (table) => [
  check('chk_incidents_confidence', sql`${table.confidence} BETWEEN 0 AND 1`),
  index('idx_incidents_occurred_at').on(table.occurredAt),
  foreignKey({
    name: 'fk_incidents_camera',
    columns: [table.cameraId],
    foreignColumns: [cameras.id],
  }).onDelete('restrict'),
  foreignKey({
    name: 'fk_incidents_category',
    columns: [table.categoryId],
    foreignColumns: [incidentCategories.id],
  }).onDelete('restrict'),
  foreignKey({
    name: 'fk_incidents_silenced_by',
    columns: [table.silencedBy],
    foreignColumns: [users.id],
  }).onDelete('set null'),
  foreignKey({
    name: 'fk_incidents_reviewed_by',
    columns: [table.reviewedBy],
    foreignColumns: [users.id],
  }).onDelete('set null'),
]);

export const evidence = pgTable('evidence', {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  incidentId: integer('incident_id').notNull(),
  type: evidenceType().notNull(),
  filePath: varchar('file_path', { length: 500 }).notNull().unique('evidence_file_path_key'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({
    name: 'fk_evidence_incident',
    columns: [table.incidentId],
    foreignColumns: [incidents.id],
  }).onDelete('restrict'),
]);

export const emergencyContacts = pgTable('emergency_contacts', {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: varchar({ length: 150 }).notNull(),
  type: contactType().notNull(),
  phone: varchar({ length: 20 }),
  email: varchar({ length: 150 }),
  receivesEmail: boolean('receives_email').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
});

export const notifications = pgTable('notifications', {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  incidentId: integer('incident_id').notNull(),
  contactId: integer('contact_id'),
  recipientEmail: varchar('recipient_email', { length: 150 }).notNull(),
  status: notificationStatus().notNull(),
  error: text(),
  sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_notifications_incident').on(table.incidentId),
  foreignKey({
    name: 'fk_notifications_incident',
    columns: [table.incidentId],
    foreignColumns: [incidents.id],
  }).onDelete('cascade'),
  foreignKey({
    name: 'fk_notifications_contact',
    columns: [table.contactId],
    foreignColumns: [emergencyContacts.id],
  }).onDelete('set null'),
]);

export const protocols = pgTable('protocols', {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  categoryId: integer('category_id').notNull(),
  title: varchar({ length: 150 }).notNull(),
  steps: text().notNull(),
  isActive: boolean('is_active').notNull().default(true),
}, (table) => [
  foreignKey({
    name: 'fk_protocols_category',
    columns: [table.categoryId],
    foreignColumns: [incidentCategories.id],
  }).onDelete('restrict'),
]);

export const incidentsByHour = pgView('v_incidents_by_hour', {
  hourBucket: timestamp('hour_bucket', { withTimezone: true }).notNull(),
  totalIncidents: bigint('total_incidents', { mode: 'bigint' }).notNull(),
}).as(sql`
  SELECT date_trunc('hour', occurred_at) AS hour_bucket, count(*) AS total_incidents
  FROM public.incidents
  WHERE review_status <> 'system_test'
  GROUP BY date_trunc('hour', occurred_at)
`);

export const incidentsByCategory = pgView('v_incidents_by_category', {
  categoryId: integer('category_id').notNull(),
  categoryCode: varchar('category_code', { length: 40 }).notNull(),
  categoryName: varchar('category_name', { length: 100 }).notNull(),
  severityLevel: severityLevel('severity_level').notNull(),
  totalIncidents: bigint('total_incidents', { mode: 'bigint' }).notNull(),
}).as(sql`
  SELECT c.id AS category_id, c.code AS category_code, c.name AS category_name,
         c.severity_level, count(i.id) AS total_incidents
  FROM public.incident_categories AS c
  LEFT JOIN public.incidents AS i
    ON i.category_id = c.id AND i.review_status <> 'system_test'
  GROUP BY c.id, c.code, c.name, c.severity_level
`);

export const falseAlarmPercentage = pgView('v_false_alarm_percentage', {
  falsePositiveCount: bigint('false_positive_count', { mode: 'bigint' }).notNull(),
  confirmedCount: bigint('confirmed_count', { mode: 'bigint' }).notNull(),
  falseAlarmPercentage: numeric('false_alarm_percentage').notNull(),
}).as(sql`
  SELECT
    count(*) FILTER (WHERE review_status = 'false_positive') AS false_positive_count,
    count(*) FILTER (WHERE review_status = 'confirmed') AS confirmed_count,
    coalesce(
      round(
        100.0 * count(*) FILTER (WHERE review_status = 'false_positive')
        / nullif(count(*) FILTER (WHERE review_status IN ('confirmed', 'false_positive')), 0),
        2
      ),
      0
    ) AS false_alarm_percentage
  FROM public.incidents
`);
