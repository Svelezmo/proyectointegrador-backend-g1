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

  async guardarConEvidencia(publicacion: Publicacion, imagenUrl: string): Promise<void> {
    const { id, creadoEn: _creadoEn, ...datos } = PublicacionMapper.aPersistencia(publicacion);
    await this.db.$transaction(async tx => {
      await tx.publicacion.upsert({
        where: { id },
        create: { id, ...datos },
        update: datos,
      });
      const evidencia = await tx.evidencia.create({
        data: { tipo: "IMAGEN", url: imagenUrl },
      });
      await tx.publicacionEvidencia.create({
        data: { publicacionId: id, evidenciaId: evidencia.id },
      });
    });
  }

  async actualizarConEvidencia(publicacion: Publicacion, imagenUrl: string): Promise<void> {
    await this.guardarConEvidencia(publicacion, imagenUrl);
  }

  async buscarPorId(id: string): Promise<Publicacion | null> {
    const fila = await this.db.publicacion.findUnique({ where: { id } });
    return fila ? PublicacionMapper.aEntidad(fila) : null;
  }

  async listarGestion(autorId?: string): Promise<Publicacion[]> {
    const filas = await this.db.publicacion.findMany({
      ...(autorId ? { where: { autorId } } : {}),
      orderBy: { actualizadoEn: "desc" },
    });
    return filas.map(PublicacionMapper.aEntidad);
  }

  async eliminar(id: string): Promise<void> {
    await this.db.publicacion.delete({ where: { id } });
  }

  async listarPublicadas({ pagina, limite, etiqueta }: Paginacion & { etiqueta?: string | undefined }) {
    const where = {
      estado: "PUBLICADA" as const,
      estaActivo: true,
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
      where: { estado: "PUBLICADA", estaActivo: true, etiqueta: { not: null } },
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
