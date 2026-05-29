ALTER TABLE "users" ADD COLUMN "level" text;
--> statement-breakpoint
UPDATE "users" SET "level" = 'starter' WHERE "level" IS NULL;
