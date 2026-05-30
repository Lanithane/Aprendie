-- Master-key encryption was simplified to a single ENCRYPTION_KEY with no
-- backwards-compatible read path (Epic 7). Existing ciphertext was written under
-- the old scheme/key and is no longer decryptable, so clear it; each user
-- re-enters their Anthropic key on next use. See docs/key-rotation-runbook.md.
UPDATE "users" SET "encrypted_anthropic_key" = NULL;
