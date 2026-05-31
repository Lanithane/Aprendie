-- Remap legacy 'foundation' level → 'starter' across all tables that store level as text.
UPDATE users SET level = 'starter' WHERE level = 'foundation';
UPDATE sentence_cache SET level = 'starter' WHERE level = 'foundation';
UPDATE attempts SET level = 'starter' WHERE level = 'foundation';
