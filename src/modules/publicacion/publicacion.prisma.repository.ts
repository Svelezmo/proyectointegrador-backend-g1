import type { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import type { Paginacion } from "../../shared/domain/paginacion.js";
import type { EtiquetaPublicacion, Publicacion } from "./publicacion.entity.js";
import { PublicacionMapper } from "./publicacion.mapper.js";
import type { PublicacionRepository } from "./publicacion.repository.js";

/** Trae junto a cada publicación su medio principal más reciente. */
const CON_IMAGEN = {
  evidencias: {
    where: { OR: [{ evidencia: { tipo: "IMAGEN" } }, { evidencia: { tipo: "VIDEO" } }] },
    select: { evidencia: { select: { url: true, tipo: true } } },
    orderBy: { evidencia: { creadoEn: "desc" as const } },
    take: 1,
  },
} satisfies Prisma.PublicacionInclude;

type Transaccion = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

/**
 * REPOSITORY (implementación con Prisma). Es el único archivo del módulo que habla con la base.
 * Recibe entidades, usa el mapper para convertirlas en filas y viceversa.
 */
export class PrismaPublicacionRepository implements PublicacionRepository {
  constructor(private readonly db: PrismaClient) {}

  async guardar(publicacion: Publicacion): Promise<void> {
    const { id, creadoEn: _creadoEn, ...datos } = PublicacionMapper.aPersistencia(publicacion);
    const { imagenUrl, tipoEvidencia } = publicacion.aProps();
    await this.db.$transaction(async tx => {
      await tx.publicacion.upsert({ where: { id }, create: { id, ...datos }, update: datos });
      await this.sincronizarEvidencia(tx, id, imagenUrl, tipoEvidencia);
    });
  }

  async buscarPorId(id: string): Promise<Publicacion | null> {
    const fila = await this.db.publicacion.findUnique({ where: { id }, include: CON_IMAGEN });
    return fila ? PublicacionMapper.aEntidad(fila) : null;
  }

  async listarGestion(autorId?: string): Promise<Publicacion[]> {
    const filas = await this.db.publicacion.findMany({
      ...(autorId ? { where: { autorId } } : {}),
      include: CON_IMAGEN,
      orderBy: { actualizadoEn: "desc" },
    });
    return filas.map(PublicacionMapper.aEntidad);
  }

  async eliminar(id: string): Promise<void> {
    await this.db.$transaction(async tx => {
      const enlaces = await tx.publicacionEvidencia.findMany({ where: { publicacionId: id }, select: { evidenciaId: true } });
      await tx.publicacion.delete({ where: { id } });
      await this.borrarEvidenciasHuerfanas(tx, enlaces.map(enlace => enlace.evidenciaId));
    });
  }

  async listarPublicadas({ pagina, limite, etiqueta }: Paginacion & { etiqueta?: EtiquetaPublicacion | undefined }) {
    const where = {
      estado: "PUBLICADA" as const,
      estaActivo: true,
      ...(etiqueta ? { etiqueta: PublicacionMapper.etiquetaAPersistencia(etiqueta) } : {}),
    };
    const [filas, total] = await this.db.$transaction([
      this.db.publicacion.findMany({
        where,
        include: CON_IMAGEN,
        orderBy: { publicadaEn: "desc" },
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      this.db.publicacion.count({ where }),
    ]);
    return { items: filas.map(PublicacionMapper.aEntidad), total };
  }

  async listarHistorico({
    pagina,
    limite,
    etiqueta,
    busqueda,
  }: Paginacion & { etiqueta?: EtiquetaPublicacion | undefined; busqueda?: string | undefined }) {
    const where = {
      estado: "PUBLICADA" as const,
      ...(etiqueta ? { etiqueta: PublicacionMapper.etiquetaAPersistencia(etiqueta) } : {}),
      ...(busqueda ? { titulo: { contains: busqueda, mode: "insensitive" as const } } : {}),
    };
    const [filas, total] = await this.db.$transaction([
      this.db.publicacion.findMany({
        where,
        include: CON_IMAGEN,
        orderBy: [{ publicadaEn: { sort: "desc", nulls: "last" } }, { id: "asc" }],
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
    return filas
      .flatMap(fila => (fila.etiqueta ? [PublicacionMapper.etiquetaDesdePersistencia(fila.etiqueta)] : []))
      .sort((a, b) => a.localeCompare(b));
  }

  async listarPorEstado(estado: Publicacion["estado"], limite: number): Promise<Publicacion[]> {
    const filas = await this.db.publicacion.findMany({
      where: { estado },
      include: CON_IMAGEN,
      orderBy: { actualizadoEn: "desc" },
      take: limite,
    });
    return filas.map(PublicacionMapper.aEntidad);
  }

  /**
   * Deja como evidencia principal exactamente la URL y tipo indicados:
   * si ya es la actual no hace nada; si cambió, quita la anterior y registra la nueva.
   */
  private async sincronizarEvidencia(
    tx: Transaccion,
    publicacionId: string,
    imagenUrl: string | null,
    tipoEvidencia: "IMAGEN" | "VIDEO" | null,
  ): Promise<void> {
    const actuales = await tx.publicacionEvidencia.findMany({
      where: {
        publicacionId,
        OR: [{ evidencia: { tipo: "IMAGEN" } }, { evidencia: { tipo: "VIDEO" } }],
      },
      select: { evidenciaId: true, evidencia: { select: { url: true, tipo: true } } },
    });
    if (
      imagenUrl &&
      tipoEvidencia &&
      actuales.length === 1 &&
      actuales[0]!.evidencia.url === imagenUrl &&
      actuales[0]!.evidencia.tipo === tipoEvidencia
    ) return;
    if (actuales.length === 0 && imagenUrl === null) return;

    const anteriores = actuales.map(enlace => enlace.evidenciaId);
    await tx.publicacionEvidencia.deleteMany({ where: { publicacionId, evidenciaId: { in: anteriores } } });
    await this.borrarEvidenciasHuerfanas(tx, anteriores);

    if (imagenUrl && tipoEvidencia) {
      const evidencia = await tx.evidencia.create({ data: { tipo: tipoEvidencia, url: imagenUrl } });
      await tx.publicacionEvidencia.create({ data: { publicacionId, evidenciaId: evidencia.id } });
    }
  }

  /** Borra las evidencias de la lista que ya no estén asociadas a ninguna publicación. */
  private async borrarEvidenciasHuerfanas(tx: Transaccion, evidenciaIds: string[]): Promise<void> {
    if (evidenciaIds.length === 0) return;
    await tx.evidencia.deleteMany({ where: { id: { in: evidenciaIds }, publicaciones: { none: {} } } });
  }
}
