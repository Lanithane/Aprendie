CREATE TABLE "usage_daily" (
	"user_id" uuid NOT NULL,
	"day" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "usage_daily_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "access" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
-- Backfill: every account that predates the access gate (Epic 12) was already using the
-- app, so grant it access. New accounts created after this migration default to 'pending'.
UPDATE "users" SET "access" = 'approved';--> statement-breakpoint
ALTER TABLE "usage_daily" ADD CONSTRAINT "usage_daily_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;