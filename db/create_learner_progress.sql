-- Mobile backend: learner progress tracking per user/training.
-- Run this once against the virtualcoach database if the table is missing
-- (Hibernate ddl-auto=update creates it on startup, but this is the safe fallback).

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_NAME = 'learner_progress'
)
BEGIN
    CREATE TABLE learner_progress (
        id                  NVARCHAR(255)   NOT NULL PRIMARY KEY,
        user_id             NVARCHAR(255)   NOT NULL,
        training_id         NVARCHAR(36)    NOT NULL,
        assignment_id       NVARCHAR(36)    NULL,
        current_slide_index INT             NOT NULL DEFAULT 0,
        total_slides        INT             NOT NULL DEFAULT 0,
        completion_percent  FLOAT           NOT NULL DEFAULT 0.0,
        quiz_scores         NVARCHAR(MAX)   NULL,
        quiz_statuses       NVARCHAR(MAX)   NULL,
        status              NVARCHAR(20)    NOT NULL DEFAULT 'NOT_STARTED',
        started_at          DATETIMEOFFSET  NULL,
        last_accessed_at    DATETIMEOFFSET  NULL,
        completed_at        DATETIMEOFFSET  NULL,
        preferred_locale    NVARCHAR(10)    NULL DEFAULT 'en'
    );

    CREATE INDEX idx_lp_user_id     ON learner_progress (user_id);
    CREATE INDEX idx_lp_training_id ON learner_progress (training_id);
    CREATE INDEX idx_lp_status      ON learner_progress (status);

    PRINT 'Table learner_progress created successfully.';
END
ELSE
BEGIN
    -- Add total_slides column if it was created before we added it to the model
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'learner_progress' AND COLUMN_NAME = 'total_slides'
    )
    BEGIN
        ALTER TABLE learner_progress ADD total_slides INT NOT NULL DEFAULT 0;
        PRINT 'Column total_slides added to learner_progress.';
    END

    PRINT 'Table learner_progress already exists — schema check done.';
END
