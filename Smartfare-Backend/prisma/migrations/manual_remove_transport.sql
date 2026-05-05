-- Migration: Remove Airport, MetroStation, Station models and related fields
-- Drop foreign keys from ItineraryItem
ALTER TABLE
    public."ItineraryItem" DROP CONSTRAINT IF EXISTS "ItineraryItem_TrainsStationId_fkey";

ALTER TABLE
    public."ItineraryItem" DROP CONSTRAINT IF EXISTS "ItineraryItem_MetroStationId_fkey";

ALTER TABLE
    public."ItineraryItem" DROP CONSTRAINT IF EXISTS "ItineraryItem_AirportId_fkey";

-- Drop the transport station tables
DROP TABLE IF EXISTS public."Station" CASCADE;

DROP TABLE IF EXISTS public."MetroStation" CASCADE;

DROP TABLE IF EXISTS public."Airport" CASCADE;

-- Drop columns from ItineraryItem
ALTER TABLE
    public."ItineraryItem" DROP COLUMN IF EXISTS "TrainsStationId";

ALTER TABLE
    public."ItineraryItem" DROP COLUMN IF EXISTS "MetroStationId";

ALTER TABLE
    public."ItineraryItem" DROP COLUMN IF EXISTS "AirportId";

-- Fix UserPreferenceInterest table name typo and add id as primary key
ALTER TABLE
    public."UserPreferenceInterest" DROP CONSTRAINT IF EXISTS "UserPreferenceInterest_pkey";

-- Rename column if it still has the typo
ALTER TABLE
    public."UserPreferenceInterest" RENAME COLUMN IF EXISTS "activityCateegoryId" TO "activityCategoryId";

-- Add id column if not exists
ALTER TABLE
    public."UserPreferenceInterest"
ADD
    COLUMN IF NOT EXISTS "id" integer NOT NULL DEFAULT nextval(
        'public."UserPreferenceInterest_id_seq"' :: regclass
    );

-- Set the new primary key
ALTER TABLE
    public."UserPreferenceInterest"
ADD
    PRIMARY KEY ("id");

-- Update _prisma_migrations table for documentation
INSERT INTO
    "_prisma_migrations" (
        id,
        checksum,
        finished_at,
        execution_time,
        migration_name,
        logs,
        rolled_back_at,
        started_at,
        applied_steps_count
    )
VALUES
    (
        md5(random() :: text),
        md5(random() :: text),
        NOW(),
        0,
        'manual_remove_transport',
        'Manually removed Airport, MetroStation, Station models and related fields',
        NULL,
        NOW(),
        1
    ) ON CONFLICT DO NOTHING;