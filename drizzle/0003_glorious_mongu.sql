CREATE TABLE "qcc_push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"leader_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "qcc_push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
ALTER TABLE "qcc_push_subscriptions" ADD CONSTRAINT "qcc_push_subscriptions_leader_id_qcc_leaders_id_fk" FOREIGN KEY ("leader_id") REFERENCES "public"."qcc_leaders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "qcc_push_subscriptions_leader_idx" ON "qcc_push_subscriptions" USING btree ("leader_id");