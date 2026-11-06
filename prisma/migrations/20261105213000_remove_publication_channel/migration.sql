ALTER TABLE "publicacion"
DROP CONSTRAINT "publicacion_canal_id_fkey",
DROP COLUMN "canal_id";

DROP TABLE "canal";
