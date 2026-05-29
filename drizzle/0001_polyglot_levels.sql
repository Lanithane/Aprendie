DELETE FROM "sentence_cache";--> statement-breakpoint
DROP INDEX "idx_sentence_cache_user_locale";--> statement-breakpoint
ALTER TABLE "sentence_cache" RENAME COLUMN "spanish" TO "prompt_text";--> statement-breakpoint
ALTER TABLE "sentence_cache" RENAME COLUMN "expected_english" TO "answer_text";--> statement-breakpoint
ALTER TABLE "sentence_cache" ADD COLUMN "learn_language" text NOT NULL;--> statement-breakpoint
ALTER TABLE "sentence_cache" ADD COLUMN "guess_language" text NOT NULL;--> statement-breakpoint
ALTER TABLE "sentence_cache" ADD COLUMN "level" text;--> statement-breakpoint
ALTER TABLE "sentence_cache" ADD COLUMN "word_breakdown" json;--> statement-breakpoint
ALTER TABLE "sentence_cache" DROP COLUMN "difficulty";--> statement-breakpoint
CREATE INDEX "idx_sentence_cache_pool" ON "sentence_cache" USING btree ("user_id","learn_language","guess_language","locale");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "locale_preference";
