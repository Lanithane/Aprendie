CREATE TABLE "grammar_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learn_language" text NOT NULL,
	"guess_language" text NOT NULL,
	"locale" text NOT NULL,
	"sections" json NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_grammar_references" ON "grammar_references" USING btree ("learn_language","guess_language","locale");