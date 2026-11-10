import type { Paginacion } from "../../shared/domain/paginacion.js";
import type { EtiquetaPublicacion, Publicacion } from "./publicacion.entity.js";

/**
 * REPOSITORY (contrato): qué operaciones de persistencia necesita el service,
 * expresadas con entidades del dominio. El service depende de ESTA interfaz,
 * no de Prisma. Así se puede probar con un repositorio en memoria y cambiar
 * la base sin tocar la lógica de negocio (principio de inversión de dependencias).
 *
 * La implementación real está en publicacion.prisma.repository.ts.
 */
export interface PublicacionRepository {
  /**
   * Inserta o actualiza la publicación completa, incluida su evidencia principal:
   * si la imagen cambió, reemplaza la evidencia anterior por la nueva (de forma atómica).
   */
  guardar(publicacion: Publicacion): Promise<void>;
  buscarPorId(id: string): Promise<Publicacion | null>;
  listarGestion(autorId?: string): Promise<Publicacion[]>;
  /** Elimina la publicación y las evidencias que solo le pertenecían a ella. */
  eliminar(id: string): Promise<void>;
  listarPublicadas(
    filtro: Paginacion & { etiqueta?: EtiquetaPublicacion | undefined },
  ): Promise<{ items: Publicacion[]; total: number }>;
  listarHistorico(
    filtro: Paginacion & { etiqueta?: EtiquetaPublicacion | undefined; busqueda?: string | undefined },
  ): Promise<{ items: Publicacion[]; total: number }>;
  /** Etiquetas distintas de las publicaciones visibles (para los filtros de la web). */
  listarEtiquetasPublicadas(): Promise<string[]>;
  listarPorEstado(estado: Publicacion["estado"], limite: number): Promise<Publicacion[]>;
}
