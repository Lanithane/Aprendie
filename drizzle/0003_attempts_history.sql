CREATE TABLE "attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sentence_id" uuid,
	"learn_language" text NOT NULL,
	"guess_language" text NOT NULL,
	"locale" text NOT NULL,
	"level" text,
	"prompt_text" text NOT NULL,
	"answer_text" text NOT NULL,
	"user_answer" text NOT NULL,
	"corrected_answer" text NOT NULL,
	"score" integer NOT NULL,
	"is_correct" boolean NOT NULL,
	"mistakes" json NOT NULL,
	"notes" text,
	"word_breakdown" json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_attempts_user_created" ON "attempts" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_attempts_user_pair" ON "attempts" USING btree ("user_id","learn_language","guess_language","locale");