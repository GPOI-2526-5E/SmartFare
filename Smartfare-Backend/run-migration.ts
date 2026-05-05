import prisma from "./src/config/prisma";

/**
 * Manual database migration script to remove transport models (Airport, MetroStation, Station)
 * and clean up related fields from ItineraryItem
 */
async function runMigration() {
    console.log("🔄 Starting database migration...");

    try {
        // Execute raw SQL to drop foreign keys and tables
        console.log("1️⃣  Dropping foreign keys from ItineraryItem...");
        await prisma.$executeRawUnsafe(`
            ALTER TABLE public."ItineraryItem" DROP CONSTRAINT IF EXISTS "ItineraryItem_TrainsStationId_fkey";
            ALTER TABLE public."ItineraryItem" DROP CONSTRAINT IF EXISTS "ItineraryItem_MetroStationId_fkey";
            ALTER TABLE public."ItineraryItem" DROP CONSTRAINT IF EXISTS "ItineraryItem_AirportId_fkey";
        `);

        console.log("2️⃣  Dropping transport station tables...");
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS public."Station" CASCADE;`);
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS public."MetroStation" CASCADE;`);
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS public."Airport" CASCADE;`);

        console.log("3️⃣  Dropping transport columns from ItineraryItem...");
        await prisma.$executeRawUnsafe(`
            ALTER TABLE public."ItineraryItem" DROP COLUMN IF EXISTS "TrainsStationId";
            ALTER TABLE public."ItineraryItem" DROP COLUMN IF EXISTS "MetroStationId";
            ALTER TABLE public."ItineraryItem" DROP COLUMN IF EXISTS "AirportId";
        `);

        console.log("4️⃣  Fixing UserPreferenceInterest table...");
        // First, drop the old primary key constraint
        await prisma.$executeRawUnsafe(`
            ALTER TABLE public."UserPreferenceInterest" DROP CONSTRAINT IF EXISTS "UserPreferenceInterest_pkey";
        `);

        // Create sequence if not exists and add id column
        await prisma.$executeRawUnsafe(`
            CREATE SEQUENCE IF NOT EXISTS public."UserPreferenceInterest_id_seq" AS INTEGER START 1 INCREMENT 1;
        `);

        // Add id column with default value from sequence
        await prisma.$executeRawUnsafe(`
            ALTER TABLE public."UserPreferenceInterest" ADD COLUMN IF NOT EXISTS "id" integer NOT NULL DEFAULT nextval('public."UserPreferenceInterest_id_seq"'::regclass);
        `);

        // Rename column if it still has the typo
        await prisma.$executeRawUnsafe(`
            ALTER TABLE public."UserPreferenceInterest" RENAME COLUMN IF EXISTS "activityCateegoryId" TO "activityCategoryId";
        `);

        // Set the new primary key
        await prisma.$executeRawUnsafe(`
            ALTER TABLE public."UserPreferenceInterest" ADD PRIMARY KEY ("id");
        `);
        await prisma.$executeRawUnsafe(`ALTER TABLE public."ItineraryItem" DROP CONSTRAINT IF EXISTS "ItineraryItem_TrainsStationId_fkey"`);
        await prisma.$executeRawUnsafe(`ALTER TABLE public."ItineraryItem" DROP CONSTRAINT IF EXISTS "ItineraryItem_MetroStationId_fkey"`);
        await prisma.$executeRawUnsafe(`ALTER TABLE public."ItineraryItem" DROP CONSTRAINT IF EXISTS "ItineraryItem_AirportId_fkey"`);

        console.log("2️⃣  Dropping transport station tables...");
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS public."Station" CASCADE`);
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS public."MetroStation" CASCADE`);
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS public."Airport" CASCADE`);

        console.log("3️⃣  Dropping transport columns from ItineraryItem...");
        await prisma.$executeRawUnsafe(`ALTER TABLE public."ItineraryItem" DROP COLUMN IF EXISTS "TrainsStationId"`);
        await prisma.$executeRawUnsafe(`ALTER TABLE public."ItineraryItem" DROP COLUMN IF EXISTS "MetroStationId"`);
        await prisma.$executeRawUnsafe(`ALTER TABLE public."ItineraryItem" DROP COLUMN IF EXISTS "AirportId"`);

        console.log("4️⃣  Fixing UserPreferenceInterest table...");
        await prisma.$executeRawUnsafe(`ALTER TABLE public."UserPreferenceInterest" DROP CONSTRAINT IF EXISTS "UserPreferenceInterest_pkey"`);
        await prisma.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS public."UserPreferenceInterest_id_seq" AS INTEGER START 1 INCREMENT 1`);
        await prisma.$executeRawUnsafe(`ALTER TABLE public."UserPreferenceInterest" ADD COLUMN IF NOT EXISTS "id" integer NOT NULL DEFAULT nextval('public."UserPreferenceInterest_id_seq"'::regclass)`);
        await prisma.$executeRawUnsafe(`ALTER TABLE public."UserPreferenceInterest" RENAME COLUMN IF EXISTS "activityCateegoryId" TO "activityCategoryId"`);
        await prisma.$executeRawUnsafe(`ALTER TABLE public."UserPreferenceInterest" ADD PRIMARY KEY ("id")`);

        console.log("✅ Migration completed successfully!");
        process.exit(0);

    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

runMigration();
