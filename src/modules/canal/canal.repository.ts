import type { PrismaClient } from "../../generated/prisma/client.js";

/**
 * Módulo canal (mínimo por ahora): solo lo que el módulo de publicaciones necesita,
 * que es resolver el id de un canal a partir de su tipo ("web", "telegram"...).
 * Cuando el canal tenga reglas propias, se completa con entity, dto, mapper y service.
 */
export interface CanalRepository {
  buscarIdActivoPorTipo(tipo: string): Promise<string | null>;
}

export class PrismaCanalRepository implements CanalRepository {
  constructor(private readonly db: PrismaClient) {}

  async buscarIdActivoPorTipo(tipo: string): Promise<string | null> {
    const canal = await this.db.canal.findFirst({ where: { tipo, activo: true }, select: { id: true } });
    return canal?.id ?? null;
  }
}
