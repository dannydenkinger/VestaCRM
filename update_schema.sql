PRAGMA foreign_keys=OFF;

-- 1. Create the new Pipeline table
CREATE TABLE "new_Pipeline" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- 2. Insert the default pipeline
INSERT INTO "new_Pipeline" ("id", "name", "updatedAt") 
VALUES ('default_pipeline_id', 'Traveler Placement', CURRENT_TIMESTAMP);

-- 3. Create the new PipelineStage table with the pipelineId
CREATE TABLE "new_PipelineStage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pipelineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "PipelineStage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "new_Pipeline" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 4. Copy data from the old PipelineStage table, adding the default pipelineId
INSERT INTO "new_PipelineStage" ("id", "pipelineId", "name", "order")
SELECT "id", 'default_pipeline_id', "name", "order" FROM "PipelineStage";

-- 5. Drop the old PipelineStage table
DROP TABLE "PipelineStage";

-- 6. Rename the new tables to the correct names
ALTER TABLE "new_Pipeline" RENAME TO "Pipeline";
ALTER TABLE "new_PipelineStage" RENAME TO "PipelineStage";

-- 7. Recreate the unique index
CREATE UNIQUE INDEX "PipelineStage_pipelineId_name_key" ON "PipelineStage"("pipelineId", "name");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
