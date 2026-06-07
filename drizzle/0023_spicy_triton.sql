CREATE TABLE "flashcards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learn_language" text NOT NULL,
	"guess_language" text NOT NULL,
	"locale" text NOT NULL,
	"deck_id" text NOT NULL,
	"lemma" text NOT NULL,
	"gloss" text NOT NULL,
	"part_of_speech" text NOT NULL,
	"gender" text,
	"example" text,
	"example_translation" text,
	"content_hash" text NOT NULL,
	"gen_input_tokens" integer DEFAULT 0 NOT NULL,
	"gen_output_tokens" integer DEFAULT 0 NOT NULL,
	"gen_cached_input_tokens" integer DEFAULT 0 NOT NULL,
	"batch_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_flashcards_content" ON "flashcards" USING btree ("learn_language","guess_language","locale","deck_id","content_hash");--> statement-breakpoint
CREATE INDEX "idx_flashcards_deck" ON "flashcards" USING btree ("learn_language","guess_language","locale","deck_id");