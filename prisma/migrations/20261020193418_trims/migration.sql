-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "trimId" TEXT;

-- CreateTable
CREATE TABLE "Trim" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,

    CONSTRAINT "Trim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Trim_modelId_slug_key" ON "Trim"("modelId", "slug");

-- CreateIndex
CREATE INDEX "Vehicle_trimId_idx" ON "Vehicle"("trimId");

-- AddForeignKey
ALTER TABLE "Trim" ADD CONSTRAINT "Trim_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_trimId_fkey" FOREIGN KEY ("trimId") REFERENCES "Trim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Datos: cada versión escrita a mano pasa al catálogo de su modelo y el vehículo queda enlazado.
-- El slug replica `slugify()` de src/lib/labels.ts; si hay varias grafías de la misma versión gana la más usada.
CREATE TEMP TABLE "_trim_text" AS
SELECT "id" AS "vehicleId", "modelId", btrim("trim") AS "name",
       btrim(regexp_replace(lower(translate(btrim("trim"), 'ÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛÑáàäâéèëêíìïîóòöôúùüûñ', 'AAAAEEEEIIIIOOOOUUUUNaaaaeeeeiiiioooouuuun')), '[^a-z0-9]+', '-', 'g'), '-') AS "slug"
FROM "Vehicle"
WHERE "trim" IS NOT NULL AND btrim("trim") <> '';

INSERT INTO "Trim" ("id", "slug", "name", "modelId")
SELECT gen_random_uuid()::text, "slug", "name", "modelId"
FROM (
  SELECT DISTINCT ON ("modelId", "slug") "modelId", "slug", "name"
  FROM "_trim_text"
  WHERE "slug" <> ''
  GROUP BY "modelId", "slug", "name"
  ORDER BY "modelId", "slug", count(*) DESC, "name"
) AS "variants";

UPDATE "Vehicle" v
SET "trimId" = t."id", "trim" = t."name"
FROM "_trim_text" x
JOIN "Trim" t ON t."modelId" = x."modelId" AND t."slug" = x."slug"
WHERE v."id" = x."vehicleId";

DROP TABLE "_trim_text";
