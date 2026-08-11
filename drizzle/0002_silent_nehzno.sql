ALTER TABLE "qcc_bacentas" ALTER COLUMN "governorship_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "qcc_governorships" ALTER COLUMN "council_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "qcc_governorships" ADD COLUMN "parent_governorship_id" uuid;--> statement-breakpoint
ALTER TABLE "qcc_governorships" ADD CONSTRAINT "qcc_governorships_parent_governorship_id_qcc_governorships_id_fk" FOREIGN KEY ("parent_governorship_id") REFERENCES "public"."qcc_governorships"("id") ON DELETE set null ON UPDATE no action;