-- CMS backend: DB-backed ingestion job queue with crash recovery.
-- Run this once against the virtualcoach database if the table is missing.

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_NAME = 'ingestion_jobs'
)
BEGIN
    CREATE TABLE ingestion_jobs (
        id             NVARCHAR(36)    NOT NULL PRIMARY KEY,
        training_id    NVARCHAR(36)    NOT NULL,
        job_type       NVARCHAR(20)    NOT NULL,   -- PROCESS | REPROCESS
        deck_path      NVARCHAR(1000)  NULL,
        data_path      NVARCHAR(1000)  NULL,
        status         NVARCHAR(20)    NOT NULL,   -- PENDING | PROCESSING | DONE | FAILED
        attempts       INT             NOT NULL DEFAULT 0,
        max_attempts   INT             NOT NULL DEFAULT 3,
        error_message  NVARCHAR(MAX)   NULL,
        created_at     DATETIMEOFFSET  NOT NULL,
        started_at     DATETIMEOFFSET  NULL,
        completed_at   DATETIMEOFFSET  NULL
    );

    CREATE INDEX idx_ij_status      ON ingestion_jobs (status);
    CREATE INDEX idx_ij_training_id ON ingestion_jobs (training_id);

    PRINT 'Table ingestion_jobs created successfully.';
END
ELSE
BEGIN
    PRINT 'Table ingestion_jobs already exists — skipped.';
END
