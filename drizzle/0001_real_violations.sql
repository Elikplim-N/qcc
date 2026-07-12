CREATE TABLE "qcc_attendance_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bacenta_id" uuid NOT NULL,
	"week_of" date NOT NULL,
	"service_attended" integer DEFAULT 0 NOT NULL,
	"service_missed" integer DEFAULT 0 NOT NULL,
	"fellowship_attended" integer DEFAULT 0 NOT NULL,
	"fellowship_missed" integer DEFAULT 0 NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qcc_fellowship_attendance_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attendance_date" date NOT NULL,
	"bacenta_id" uuid NOT NULL,
	"taken_by_leader_id" uuid NOT NULL,
	"attendance_count" integer DEFAULT 0 NOT NULL,
	"visitor_count" integer DEFAULT 0 NOT NULL,
	"income_pesewas" integer DEFAULT 0 NOT NULL,
	"foreign_currency_details" text,
	"tithers_count" integer DEFAULT 0 NOT NULL,
	"photo_url" text,
	"status" "qcc_submission_status" DEFAULT 'submitted' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qcc_fellowship_attendance_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"present" boolean DEFAULT false NOT NULL,
	"remarks" text
);
--> statement-breakpoint
ALTER TABLE "qcc_attendance_reports" ADD CONSTRAINT "qcc_attendance_reports_bacenta_id_qcc_bacentas_id_fk" FOREIGN KEY ("bacenta_id") REFERENCES "public"."qcc_bacentas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qcc_fellowship_attendance_days" ADD CONSTRAINT "qcc_fellowship_attendance_days_bacenta_id_qcc_bacentas_id_fk" FOREIGN KEY ("bacenta_id") REFERENCES "public"."qcc_bacentas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qcc_fellowship_attendance_days" ADD CONSTRAINT "qcc_fellowship_attendance_days_taken_by_leader_id_qcc_leaders_id_fk" FOREIGN KEY ("taken_by_leader_id") REFERENCES "public"."qcc_leaders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qcc_fellowship_attendance_entries" ADD CONSTRAINT "qcc_fellowship_attendance_entries_day_id_qcc_fellowship_attendance_days_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."qcc_fellowship_attendance_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qcc_fellowship_attendance_entries" ADD CONSTRAINT "qcc_fellowship_attendance_entries_member_id_qcc_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."qcc_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "qcc_ar_bacenta_week_uq" ON "qcc_attendance_reports" USING btree ("bacenta_id","week_of");--> statement-breakpoint
CREATE UNIQUE INDEX "qcc_fad_bacenta_date_uq" ON "qcc_fellowship_attendance_days" USING btree ("bacenta_id","attendance_date");--> statement-breakpoint
CREATE UNIQUE INDEX "qcc_fae_day_member_uq" ON "qcc_fellowship_attendance_entries" USING btree ("day_id","member_id");--> statement-breakpoint
CREATE INDEX "qcc_fae_member_idx" ON "qcc_fellowship_attendance_entries" USING btree ("member_id");