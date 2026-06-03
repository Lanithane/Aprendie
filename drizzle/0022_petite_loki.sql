CREATE TABLE "sentence_batch_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"learn_language" text NOT NULL,
	"guess_language" text NOT NULL,
	"locale" text NOT NULL,
	"level" text,
	"count" integer NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sentences" ADD COLUMN "batch_id" text;--> statement-breakpoint
ALTER TABLE "sentence_batch_jobs" ADD CONSTRAINT "sentence_batch_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_sentence_batch_jobs_slice" ON "sentence_batch_jobs" USING btree ("status","learn_language","guess_language","locale","level");--> statement-breakpoint
CREATE INDEX "idx_sentence_batch_jobs_status" ON "sentence_batch_jobs" USING btree ("status","created_at");