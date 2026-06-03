CREATE TABLE "lexeme_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learn_language" text NOT NULL,
	"guess_language" text NOT NULL,
	"lemma" text NOT NULL,
	"definition" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_lexeme_definitions" ON "lexeme_definitions" USING btree ("learn_language","guess_language","lemma");