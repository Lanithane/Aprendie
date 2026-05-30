-- The "mercado" theme was renamed to "abra" (registry id change; same palette).
-- Rewrite any persisted preference so the DB stays in sync with the registry.
-- The client already falls back gracefully for unknown ids, so this is cosmetic
-- cleanup, not a correctness fix.
UPDATE "users" SET "theme_id" = 'abra' WHERE "theme_id" = 'mercado';
