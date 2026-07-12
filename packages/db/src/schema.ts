import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// All enums and tables are prefixed with qcc_ because this Postgres
// database is shared with other apps.

export const qccAreaEnum = pgEnum("qcc_area", ["area1", "area2"]);

export const qccRoleEnum = pgEnum("qcc_role", [
  "chief_admin",
  "council_leader",
  "governor",
  "bacenta_leader",
  "arrivals_admin",
  "arrivals_counter",
]);

export const qccGenderEnum = pgEnum("qcc_gender", ["male", "female"]);

export const qccMemberStatusEnum = pgEnum("qcc_member_status", [
  "committed",
  "unstable",
  "lost",
]);

export const qccSubmissionStatusEnum = pgEnum("qcc_submission_status", [
  "submitted",
  "approved",
  "rejected",
]);

// ---------------------------------------------------------------------------
// Hierarchy: council -> governorship -> bacenta
// ---------------------------------------------------------------------------

export const councils = pgTable("qcc_councils", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const governorships = pgTable(
  "qcc_governorships",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    councilId: uuid("council_id")
      .notNull()
      .references(() => councils.id, { onDelete: "cascade" }),
    area: qccAreaEnum("area").notNull().default("area1"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [index("qcc_governorships_council_idx").on(t.councilId)],
);

export const bacentas = pgTable(
  "qcc_bacentas",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    governorshipId: uuid("governorship_id")
      .notNull()
      .references(() => governorships.id, { onDelete: "cascade" }),
    area: qccAreaEnum("area").notNull().default("area1"),
    // Bussing bank details (Area 2)
    momoNumber: text("momo_number"),
    momoName: text("momo_name"),
    mobileNetwork: text("mobile_network"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [index("qcc_bacentas_governorship_idx").on(t.governorshipId)],
);

// ---------------------------------------------------------------------------
// Members & leaders. A leader account is always an extension of a member
// record (members.id is the single source of truth).
// ---------------------------------------------------------------------------

export const members = pgTable(
  "qcc_members",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    memberCode: text("member_code").notNull().unique(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    otherName: text("other_name"),
    gender: qccGenderEnum("gender"),
    phoneNumber: text("phone_number").notNull(),
    altPhoneNumber: text("alt_phone_number"),
    email: text("email"),
    location: text("location"),
    dateOfBirth: date("date_of_birth"),
    isWorking: boolean("is_working").notNull().default(false),
    school: text("school"),
    status: qccMemberStatusEnum("status").notNull().default("committed"),
    photoUrl: text("photo_url"),
    bacentaId: uuid("bacenta_id").references(() => bacentas.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    createdByLeaderId: uuid("created_by_leader_id"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    index("qcc_members_bacenta_idx").on(t.bacentaId),
    index("qcc_members_phone_idx").on(t.phoneNumber),
  ],
);

export const leaders = pgTable(
  "qcc_leaders",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    memberId: uuid("member_id")
      .notNull()
      .unique()
      .references(() => members.id, { onDelete: "cascade" }),
    role: qccRoleEnum("role").notNull(),
    // Scope: exactly one of these is set depending on role.
    // chief_admin / arrivals_admin / arrivals_counter are church-wide (all null).
    councilId: uuid("council_id").references(() => councils.id, {
      onDelete: "set null",
    }),
    governorshipId: uuid("governorship_id").references(() => governorships.id, {
      onDelete: "set null",
    }),
    bacentaId: uuid("bacenta_id").references(() => bacentas.id, {
      onDelete: "set null",
    }),
    username: text("username").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [index("qcc_leaders_role_idx").on(t.role)],
);

export const sessions = pgTable(
  "qcc_sessions",
  {
    token: text("token").primaryKey(),
    leaderId: uuid("leader_id")
      .notNull()
      .references(() => leaders.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [index("qcc_sessions_leader_idx").on(t.leaderId)],
);

// ---------------------------------------------------------------------------
// Arrivals
// ---------------------------------------------------------------------------

// Stage 1 — Pre-Mobilisation. Both areas submit this. One per bacenta per week.
export const premobilisations = pgTable(
  "qcc_premobilisations",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    weekOf: date("week_of").notNull(),
    bacentaId: uuid("bacenta_id")
      .notNull()
      .references(() => bacentas.id, { onDelete: "cascade" }),
    leaderId: uuid("leader_id")
      .notNull()
      .references(() => leaders.id, { onDelete: "cascade" }),
    photoUrl: text("photo_url").notNull(),
    attendanceCount: integer("attendance_count").notNull().default(0),
    codeOfTheDay: text("code_of_the_day"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("qcc_premob_bacenta_week_uq").on(t.bacentaId, t.weekOf)],
);

export type VehicleEntry = {
  type: "Sprinter" | "Urvan" | "Car";
  leaderCount: number;
  counterCount?: number | null;
  inAndOut?: "in_and_out" | "only_in" | null;
  topUp?: number | null;
  photoUrl?: string | null;
};

// Stage 2 — On-the-Way. Area 2 only. One per bacenta per week.
export const onTheWaySubmissions = pgTable(
  "qcc_on_the_way",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    weekOf: date("week_of").notNull(),
    bacentaId: uuid("bacenta_id")
      .notNull()
      .references(() => bacentas.id, { onDelete: "cascade" }),
    leaderId: uuid("leader_id")
      .notNull()
      .references(() => leaders.id, { onDelete: "cascade" }),
    reportedMembers: integer("reported_members").notNull().default(0),
    reportedVisitors: integer("reported_visitors").notNull().default(0),
    vehicles: jsonb("vehicles").$type<VehicleEntry[]>().notNull().default([]),
    costPesewas: integer("cost_pesewas").notNull().default(0),
    momoNumber: text("momo_number"),
    status: qccSubmissionStatusEnum("status").notNull().default("submitted"),
    reviewNotes: text("review_notes"),
    reviewedByLeaderId: uuid("reviewed_by_leader_id"),
    reviewedAt: timestamp("reviewed_at", { mode: "date" }),
    arrivedAt: timestamp("arrived_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("qcc_otw_bacenta_week_uq").on(t.bacentaId, t.weekOf)],
);

// ---------------------------------------------------------------------------
// Service attendance
// ---------------------------------------------------------------------------

export const serviceAttendanceDays = pgTable(
  "qcc_service_attendance_days",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    serviceDate: date("service_date").notNull(),
    bacentaId: uuid("bacenta_id")
      .notNull()
      .references(() => bacentas.id, { onDelete: "cascade" }),
    takenByLeaderId: uuid("taken_by_leader_id")
      .notNull()
      .references(() => leaders.id, { onDelete: "cascade" }),
    visitorCount: integer("visitor_count").notNull().default(0),
    status: qccSubmissionStatusEnum("status").notNull().default("submitted"),
    reviewedByLeaderId: uuid("reviewed_by_leader_id"),
    reviewedAt: timestamp("reviewed_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("qcc_sad_bacenta_date_uq").on(t.bacentaId, t.serviceDate),
  ],
);

export const serviceAttendanceEntries = pgTable(
  "qcc_service_attendance_entries",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    dayId: uuid("day_id")
      .notNull()
      .references(() => serviceAttendanceDays.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    present: boolean("present").notNull().default(false),
    remarks: text("remarks"),
  },
  (t) => [
    uniqueIndex("qcc_sae_day_member_uq").on(t.dayId, t.memberId),
    index("qcc_sae_member_idx").on(t.memberId),
  ],
);

// ---------------------------------------------------------------------------
// Settings & audit
// ---------------------------------------------------------------------------

export const settings = pgTable("qcc_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const auditLogs = pgTable(
  "qcc_audit_logs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    action: text("action").notNull(),
    actorLeaderId: uuid("actor_leader_id"),
    targetType: text("target_type"),
    targetId: text("target_id"),
    detail: jsonb("detail"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [index("qcc_audit_created_idx").on(t.createdAt)],
);

// ---------------------------------------------------------------------------
// Fellowship attendance
// ---------------------------------------------------------------------------

export const fellowshipAttendanceDays = pgTable(
  "qcc_fellowship_attendance_days",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    attendanceDate: date("attendance_date").notNull(),
    bacentaId: uuid("bacenta_id")
      .notNull()
      .references(() => bacentas.id, { onDelete: "cascade" }),
    takenByLeaderId: uuid("taken_by_leader_id")
      .notNull()
      .references(() => leaders.id, { onDelete: "cascade" }),
    visitorCount: integer("visitor_count").notNull().default(0),
    status: qccSubmissionStatusEnum("status").notNull().default("submitted"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("qcc_fad_bacenta_date_uq").on(t.bacentaId, t.attendanceDate),
  ],
);

export const fellowshipAttendanceEntries = pgTable(
  "qcc_fellowship_attendance_entries",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    dayId: uuid("day_id")
      .notNull()
      .references(() => fellowshipAttendanceDays.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    present: boolean("present").notNull().default(false),
    remarks: text("remarks"),
  },
  (t) => [
    uniqueIndex("qcc_fae_day_member_uq").on(t.dayId, t.memberId),
    index("qcc_fae_member_idx").on(t.memberId),
  ],
);

// ---------------------------------------------------------------------------
// Attendance reports
// ---------------------------------------------------------------------------

export const attendanceReports = pgTable(
  "qcc_attendance_reports",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    bacentaId: uuid("bacenta_id")
      .notNull()
      .references(() => bacentas.id, { onDelete: "cascade" }),
    weekOf: date("week_of").notNull(),
    serviceAttended: integer("service_attended").notNull().default(0),
    serviceMissed: integer("service_missed").notNull().default(0),
    fellowshipAttended: integer("fellowship_attended").notNull().default(0),
    fellowshipMissed: integer("fellowship_missed").notNull().default(0),
    generatedAt: timestamp("generated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("qcc_ar_bacenta_week_uq").on(t.bacentaId, t.weekOf),
  ],
);
