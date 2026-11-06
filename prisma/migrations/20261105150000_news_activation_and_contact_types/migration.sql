CREATE TYPE "tipo_informacion_contacto" AS ENUM ('red_social', 'numero_contacto', 'direccion');

ALTER TABLE "publicacion"
ADD COLUMN "esta_activo" BOOLEAN NOT NULL DEFAULT false;

UPDATE "publicacion"
SET "esta_activo" = ("estado" = 'publicada');

ALTER TABLE "informacion_contacto"
ADD COLUMN "nombre" TEXT,
ADD COLUMN "tipo" "tipo_informacion_contacto" NOT NULL DEFAULT 'red_social',
ADD COLUMN "informacion" TEXT;

UPDATE "informacion_contacto"
SET
    "nombre" = "clave",
    "informacion" = "valor",
    "tipo" = CASE
        WHEN lower("clave") LIKE '%direccion%' OR lower("clave") LIKE '%dirección%' THEN 'direccion'::"tipo_informacion_contacto"
        WHEN lower("clave") LIKE '%telefono%' OR lower("clave") LIKE '%teléfono%' OR lower("clave") LIKE '%contacto%' THEN 'numero_contacto'::"tipo_informacion_contacto"
        ELSE 'red_social'::"tipo_informacion_contacto"
    END;

ALTER TABLE "informacion_contacto"
ALTER COLUMN "nombre" SET NOT NULL,
ALTER COLUMN "informacion" SET NOT NULL,
ALTER COLUMN "tipo" DROP DEFAULT;

DROP INDEX "informacion_contacto_clave_key";
ALTER TABLE "informacion_contacto" DROP COLUMN "clave", DROP COLUMN "valor";
CREATE UNIQUE INDEX "informacion_contacto_nombre_tipo_key" ON "informacion_contacto"("nombre", "tipo");
