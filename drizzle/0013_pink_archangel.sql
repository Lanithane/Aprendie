ALTER TABLE "attempts" ADD COLUMN "grade" text;

-- Backfill grade from existing scores so historical grades are stable even if
-- band thresholds are later retuned. Bands mirror shared/grades.ts.
UPDATE "attempts" SET "grade" = CASE
  WHEN score >= 97 THEN 'A+'
  WHEN score >= 90 THEN 'A'
  WHEN score >= 80 THEN 'B'
  WHEN score >= 65 THEN 'C'
  WHEN score >= 50 THEN 'D'
  ELSE 'F'
END
WHERE "grade" IS NULL;
