CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "rol_upnews" AS ENUM ('directora', 'comunicaciones', 'colaborador');
CREATE TYPE "estado_publicacion" AS ENUM ('borrador', 'pendiente_aprobacion', 'publicada', 'archivada');
CREATE TYPE "tipo_evidencia" AS ENUM ('imagen', 'video');

CREATE TABLE "usuario_autorizado" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "telegram_id" BIGINT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" "rol_upnews" NOT NULL DEFAULT 'colaborador',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "usuario_autorizado_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "canal" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "canal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "publicacion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "titulo" TEXT NOT NULL,
    "resumen" TEXT,
    "cuerpo" TEXT NOT NULL,
    "proposito" TEXT,
    "etiqueta" TEXT,
    "estado" "estado_publicacion" NOT NULL DEFAULT 'borrador',
    "autor_id" UUID NOT NULL,
    "aprobado_por" UUID,
    "canal_id" UUID NOT NULL,
    "modulo_origen" TEXT,
    "registro_origen_id" UUID,
    "publicada_en" TIMESTAMPTZ(6),
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "publicacion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evidencia" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tipo" "tipo_evidencia" NOT NULL,
    "url" TEXT NOT NULL,
    "descripcion" TEXT,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "evidencia_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "publicacion_evidencia" (
    "publicacion_id" UUID NOT NULL,
    "evidencia_id" UUID NOT NULL,
    "consentimiento_verificado" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "publicacion_evidencia_pkey" PRIMARY KEY ("publicacion_id", "evidencia_id")
);

CREATE TABLE "metrica_publicacion" (
    "metrica_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "publicacion_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "vistas" INTEGER NOT NULL DEFAULT 0,
    "reacciones" INTEGER NOT NULL DEFAULT 0,
    "clics" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "metrica_publicacion_pkey" PRIMARY KEY ("metrica_id")
);

CREATE TABLE "informacion_contacto" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "actualizado_por" UUID,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "informacion_contacto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "usuario_autorizado_telegram_id_key" ON "usuario_autorizado"("telegram_id");
CREATE UNIQUE INDEX "canal_tipo_key" ON "canal"("tipo");
CREATE INDEX "publicacion_estado_publicada_en_idx" ON "publicacion"("estado", "publicada_en" DESC);
CREATE UNIQUE INDEX "metrica_publicacion_publicacion_id_fecha_key" ON "metrica_publicacion"("publicacion_id", "fecha");
CREATE UNIQUE INDEX "informacion_contacto_clave_key" ON "informacion_contacto"("clave");

ALTER TABLE "publicacion" ADD CONSTRAINT "publicacion_autor_id_fkey"
    FOREIGN KEY ("autor_id") REFERENCES "usuario_autorizado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "publicacion" ADD CONSTRAINT "publicacion_aprobado_por_fkey"
    FOREIGN KEY ("aprobado_por") REFERENCES "usuario_autorizado"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "publicacion" ADD CONSTRAINT "publicacion_canal_id_fkey"
    FOREIGN KEY ("canal_id") REFERENCES "canal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "publicacion_evidencia" ADD CONSTRAINT "publicacion_evidencia_publicacion_id_fkey"
    FOREIGN KEY ("publicacion_id") REFERENCES "publicacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "publicacion_evidencia" ADD CONSTRAINT "publicacion_evidencia_evidencia_id_fkey"
    FOREIGN KEY ("evidencia_id") REFERENCES "evidencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "metrica_publicacion" ADD CONSTRAINT "metrica_publicacion_publicacion_id_fkey"
    FOREIGN KEY ("publicacion_id") REFERENCES "publicacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "informacion_contacto" ADD CONSTRAINT "informacion_contacto_actualizado_por_fkey"
    FOREIGN KEY ("actualizado_por") REFERENCES "usuario_autorizado"("id") ON DELETE SET NULL ON UPDATE CASCADE;
