CREATE TYPE "public"."qcc_area" AS ENUM('area1', 'area2');--> statement-breakpoint
CREATE TYPE "public"."qcc_gender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."qcc_member_status" AS ENUM('committed', 'unstable', 'lost');--> statement-breakpoint
CREATE TYPE "public"."qcc_role" AS ENUM('chief_admin', 'council_leader', 'governor', 'bacenta_leader', 'arrivals_admin', 'arrivals_counter');--> statement-breakpoint
CREATE TYPE "public"."qcc_submission_status" AS ENUM('submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "qcc_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" text NOT NULL,
	"actor_leader_id" uuid,
	"target_type" text,
	"target_id" text,
	"detail" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qcc_bacentas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"governorship_id" uuid NOT NULL,
	"area" "qcc_area" DEFAULT 'area1' NOT NULL,
	"momo_number" text,
	"momo_name" text,
	"mobile_network" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qcc_councils" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qcc_governorships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"council_id" uuid NOT NULL,
	"area" "qcc_area" DEFAULT 'area1' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qcc_leaders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"role" "qcc_role" NOT NULL,
	"council_id" uuid,
	"governorship_id" uuid,
	"bacenta_id" uuid,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "qcc_leaders_member_id_unique" UNIQUE("member_id"),
	CONSTRAINT "qcc_leaders_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "qcc_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_code" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"other_name" text,
	"gender" "qcc_gender",
	"phone_number" text NOT NULL,
	"alt_phone_number" text,
	"email" text,
	"location" text,
	"date_of_birth" date,
	"is_working" boolean DEFAULT false NOT NULL,
	"school" text,
	"status" "qcc_member_status" DEFAULT 'committed' NOT NULL,
	"photo_url" text,
	"bacenta_id" uuid,
	"notes" text,
	"created_by_leader_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "qcc_members_member_code_unique" UNIQUE("member_code")
);
--> statement-breakpoint
CREATE TABLE "qcc_on_the_way" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_of" date NOT NULL,
	"bacenta_id" uuid NOT NULL,
	"leader_id" uuid NOT NULL,
	"reported_members" integer DEFAULT 0 NOT NULL,
	"reported_visitors" integer DEFAULT 0 NOT NULL,
	"vehicles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cost_pesewas" integer DEFAULT 0 NOT NULL,
	"momo_number" text,
	"status" "qcc_submission_status" DEFAULT 'submitted' NOT NULL,
	"review_notes" text,
	"reviewed_by_leader_id" uuid,
	"reviewed_at" timestamp,
	"arrived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qcc_premobilisations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_of" date NOT NULL,
	"bacenta_id" uuid NOT NULL,
	"leader_id" uuid NOT NULL,
	"photo_url" text NOT NULL,
	"attendance_count" integer DEFAULT 0 NOT NULL,
	"code_of_the_day" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qcc_service_attendance_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_date" date NOT NULL,
	"bacenta_id" uuid NOT NULL,
	"taken_by_leader_id" uuid NOT NULL,
	"visitor_count" integer DEFAULT 0 NOT NULL,
	"status" "qcc_submission_status" DEFAULT 'submitted' NOT NULL,
	"reviewed_by_leader_id" uuid,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qcc_service_attendance_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"present" boolean DEFAULT false NOT NULL,
	"remarks" text
);
--> statement-breakpoint
CREATE TABLE "qcc_sessions" (
	"token" text PRIMARY KEY NOT NULL,
	"leader_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qcc_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "qcc_bacentas" ADD CONSTRAINT "qcc_bacentas_governorship_id_qcc_governorships_id_fk" FOREIGN KEY ("governorship_id") REFERENCES "public"."qcc_governorships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qcc_governorships" ADD CONSTRAINT "qcc_governorships_council_id_qcc_councils_id_fk" FOREIGN KEY ("council_id") REFERENCES "public"."qcc_councils"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qcc_leaders" ADD CONSTRAINT "qcc_leaders_member_id_qcc_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."qcc_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qcc_leaders" ADD CONSTRAINT "qcc_leaders_council_id_qcc_councils_id_fk" FOREIGN KEY ("council_id") REFERENCES "public"."qcc_councils"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qcc_leaders" ADD CONSTRAINT "qcc_leaders_governorship_id_qcc_governorships_id_fk" FOREIGN KEY ("governorship_id") REFERENCES "public"."qcc_governorships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qcc_leaders" ADD CONSTRAINT "qcc_leaders_bacenta_id_qcc_bacentas_id_fk" FOREIGN KEY ("bacenta_id") REFERENCES "public"."qcc_bacentas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qcc_members" ADD CONSTRAINT "qcc_members_bacenta_id_qcc_bacentas_id_fk" FOREIGN KEY ("bacenta_id") REFERENCES "public"."qcc_bacentas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qcc_on_the_way" ADD CONSTRAINT "qcc_on_the_way_bacenta_id_qcc_bacentas_id_fk" FOREIGN KEY ("bacenta_id") REFERENCES "public"."qcc_bacentas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qcc_on_the_way" ADD CONSTRAINT "qcc_on_the_way_leader_id_qcc_leaders_id_fk" FOREIGN KEY ("leader_id") REFERENCES "public"."qcc_leaders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qcc_premobilisations" ADD CONSTRAINT "qcc_premobilisations_bacenta_id_qcc_bacentas_id_fk" FOREIGN KEY ("bacenta_id") REFERENCES "public"."qcc_bacentas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qcc_premobilisations" ADD CONSTRAINT "qcc_premobilisations_leader_id_qcc_leaders_id_fk" FOREIGN KEY ("leader_id") REFERENCES "public"."qcc_leaders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qcc_service_attendance_days" ADD CONSTRAINT "qcc_service_attendance_days_bacenta_id_qcc_bacentas_id_fk" FOREIGN KEY ("bacenta_id") REFERENCES "public"."qcc_bacentas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qcc_service_attendance_days" ADD CONSTRAINT "qcc_service_attendance_days_taken_by_leader_id_qcc_leaders_id_fk" FOREIGN KEY ("taken_by_leader_id") REFERENCES "public"."qcc_leaders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qcc_service_attendance_entries" ADD CONSTRAINT "qcc_service_attendance_entries_day_id_qcc_service_attendance_days_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."qcc_service_attendance_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qcc_service_attendance_entries" ADD CONSTRAINT "qcc_service_attendance_entries_member_id_qcc_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."qcc_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qcc_sessions" ADD CONSTRAINT "qcc_sessions_leader_id_qcc_leaders_id_fk" FOREIGN KEY ("leader_id") REFERENCES "public"."qcc_leaders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "qcc_audit_created_idx" ON "qcc_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "qcc_bacentas_governorship_idx" ON "qcc_bacentas" USING btree ("governorship_id");--> statement-breakpoint
CREATE INDEX "qcc_governorships_council_idx" ON "qcc_governorships" USING btree ("council_id");--> statement-breakpoint
CREATE INDEX "qcc_leaders_role_idx" ON "qcc_leaders" USING btree ("role");--> statement-breakpoint
CREATE INDEX "qcc_members_bacenta_idx" ON "qcc_members" USING btree ("bacenta_id");--> statement-breakpoint
CREATE INDEX "qcc_members_phone_idx" ON "qcc_members" USING btree ("phone_number");--> statement-breakpoint
CREATE UNIQUE INDEX "qcc_otw_bacenta_week_uq" ON "qcc_on_the_way" USING btree ("bacenta_id","week_of");--> statement-breakpoint
CREATE UNIQUE INDEX "qcc_premob_bacenta_week_uq" ON "qcc_premobilisations" USING btree ("bacenta_id","week_of");--> statement-breakpoint
CREATE UNIQUE INDEX "qcc_sad_bacenta_date_uq" ON "qcc_service_attendance_days" USING btree ("bacenta_id","service_date");--> statement-breakpoint
CREATE UNIQUE INDEX "qcc_sae_day_member_uq" ON "qcc_service_attendance_entries" USING btree ("day_id","member_id");--> statement-breakpoint
CREATE INDEX "qcc_sae_member_idx" ON "qcc_service_attendance_entries" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "qcc_sessions_leader_idx" ON "qcc_sessions" USING btree ("leader_id");