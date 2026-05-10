-- Mobile backend: stores questions the AI could not answer.
-- Run this once against the virtualcoach database if the table is missing
-- (Hibernate ddl-auto=update creates it on startup, but this script is the safe fallback).

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_NAME = 'unanswered_questions'
)
BEGIN
    CREATE TABLE unanswered_questions (
        id           NVARCHAR(36)    NOT NULL PRIMARY KEY,
        training_id  NVARCHAR(36)    NOT NULL,
        user_id      NVARCHAR(36)    NULL,
        slide_index  INT             NOT NULL DEFAULT 0,
        locale       NVARCHAR(10)    NULL,
        question     NVARCHAR(MAX)   NOT NULL,
        ai_response  NVARCHAR(MAX)   NULL,
        asked_at     DATETIMEOFFSET  NOT NULL,
        reviewed     BIT             NOT NULL DEFAULT 0
    );

    CREATE INDEX idx_uq_training_id ON unanswered_questions (training_id);
    CREATE INDEX idx_uq_reviewed    ON unanswered_questions (reviewed);
    CREATE INDEX idx_uq_asked_at    ON unanswered_questions (asked_at);

    PRINT 'Table unanswered_questions created successfully.';
END
ELSE
BEGIN
    PRINT 'Table unanswered_questions already exists — skipped.';
END
