ALTER TABLE "usuario_autorizado"
ALTER COLUMN "telegram_id" DROP NOT NULL;

ALTER TABLE "usuario_autorizado"
ADD COLUMN "id_usuario_externo" BIGINT;

CREATE UNIQUE INDEX "usuario_autorizado_id_usuario_externo_key"
ON "usuario_autorizado"("id_usuario_externo");
