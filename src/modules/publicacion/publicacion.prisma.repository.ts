import type { PrismaClient } from "../../generated/prisma/client.js";
import type { Paginacion } from "../../shared/domain/paginacion.js";
import type { Publicacion } from "./publicacion.entity.js";
import { PublicacionMapper } from "./publicacion.mapper.js";
import type { PublicacionRepository } from "./publicacion.repository.js";

/**
 * REPOSITORY (implementación con Prisma). Es el único archivo del módulo que habla con la base.
 * Recibe entidades, usa el mapper para convertirlas en filas y viceversa.
 */
export class PrismaPublicacionRepository implements PublicacionRepository {
  constructor(private readonly db: PrismaClient) {}

  async guardar(publicacion: Publicacion): Promise<void> {
    const { id, creadoEn: _creadoEn, ...datos } = PublicacionMapper.aPersistencia(publicacion);
    await this.db.publicacion.upsert({
      where: { id },
      create: { id, ...datos },
      update: datos,
    });
  }

  async buscarPorId(id: string): Promise<Publicacion | null> {
    const fila = await this.db.publicacion.findUnique({ where: { id } });
    return fila ? PublicacionMapper.aEntidad(fila) : null;
  }

  async listarPublicadas({ pagina, limite, etiqueta }: Paginacion & { etiqueta?: string | undefined }) {
    const where = {
      estado: "PUBLICADA" as const,
      ...(etiqueta ? { etiqueta: { equals: etiqueta, mode: "insensitive" as const } } : {}),
    };
    const [filas, total] = await this.db.$transaction([
      this.db.publicacion.findMany({
        where,
        orderBy: { publicadaEn: "desc" },
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      this.db.publicacion.count({ where }),
    ]);
    return { items: filas.map(PublicacionMapper.aEntidad), total };
  }

  async listarEtiquetasPublicadas(): Promise<string[]> {
    const filas = await this.db.publicacion.findMany({
      where: { estado: "PUBLICADA", etiqueta: { not: null } },
      distinct: ["etiqueta"],
      select: { etiqueta: true },
      orderBy: { etiqueta: "asc" },
    });
    return filas.flatMap(fila => (fila.etiqueta ? [fila.etiqueta] : []));
  }

  async listarPorEstado(estado: Publicacion["estado"], limite: number): Promise<Publicacion[]> {
    const filas = await this.db.publicacion.findMany({
      where: { estado },
      orderBy: { actualizadoEn: "desc" },
      take: limite,
    });
    return filas.map(PublicacionMapper.aEntidad);
  }
}
