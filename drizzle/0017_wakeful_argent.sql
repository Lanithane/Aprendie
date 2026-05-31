CREATE TABLE "lexeme_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"learn_language" text NOT NULL,
	"lemma" text NOT NULL,
	"part_of_speech" text NOT NULL,
	"seen_count" integer DEFAULT 0 NOT NULL,
	"correct_count" integer DEFAULT 0 NOT NULL,
	"incorrect_count" integer DEFAULT 0 NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lexeme_variant_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"learn_language" text NOT NULL,
	"lemma" text NOT NULL,
	"surface" text NOT NULL,
	"seen_count" integer DEFAULT 0 NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lexeme_stats" ADD CONSTRAINT "lexeme_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lexeme_variant_stats" ADD CONSTRAINT "lexeme_variant_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_lexeme_stats" ON "lexeme_stats" USING btree ("user_id","learn_language","lemma");--> statement-breakpoint
CREATE INDEX "idx_lexeme_stats_user_lang" ON "lexeme_stats" USING btree ("user_id","learn_language");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_lexeme_variant_stats" ON "lexeme_variant_stats" USING btree ("user_id","learn_language","lemma","surface");--> statement-breakpoint
CREATE INDEX "idx_lexeme_variant_user_lang_lemma" ON "lexeme_variant_stats" USING btree ("user_id","learn_language","lemma");