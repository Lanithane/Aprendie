CREATE TABLE IF NOT EXISTS "app_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"daily_graded_cap" integer DEFAULT 100 NOT NULL,
	"signups_paused" boolean DEFAULT false NOT NULL,
	"spend_paused" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "app_settings" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "cap_exempt_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "daily_cap_override" integer;
