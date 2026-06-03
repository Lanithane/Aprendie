CREATE TABLE "sentence_exposures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sentence_id" uuid NOT NULL,
	"seen_count" integer DEFAULT 0 NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sentences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learn_language" text NOT NULL,
	"guess_language" text NOT NULL,
	"locale" text NOT NULL,
	"level" text,
	"prompt_text" text NOT NULL,
	"answer_text" text NOT NULL,
	"word_breakdown" json,
	"theme" text,
	"content_hash" text NOT NULL,
	"gen_input_tokens" integer DEFAULT 0 NOT NULL,
	"gen_output_tokens" integer DEFAULT 0 NOT NULL,
	"gen_cached_input_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sentence_exposures" ADD CONSTRAINT "sentence_exposures_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sentence_exposures" ADD CONSTRAINT "sentence_exposures_sentence_id_sentences_id_fk" FOREIGN KEY ("sentence_id") REFERENCES "public"."sentences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sentence_exposures" ON "sentence_exposures" USING btree ("user_id","sentence_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sentences_content" ON "sentences" USING btree ("learn_language","guess_language","locale","level","content_hash");--> statement-breakpoint
CREATE INDEX "idx_sentences_slice" ON "sentences" USING btree ("learn_language","guess_language","locale","level");