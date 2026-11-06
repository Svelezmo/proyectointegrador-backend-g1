import type { Paginacion } from "../../shared/domain/paginacion.js";
import type { Publicacion } from "./publicacion.entity.js";

/**
 * REPOSITORY (contrato): qué operaciones de persistencia necesita el service,
 * expresadas con entidades del dominio. El service depende de ESTA interfaz,
 * no de Prisma. Así se puede probar con un repositorio en memoria y cambiar
 * la base sin tocar la lógica de negocio (principio de inversión de dependencias).
 *
 * La implementación real está en publicacion.prisma.repository.ts.
 */
export interface PublicacionRepository {
  /** Inserta o actualiza la publicación completa. */
  guardar(publicacion: Publicacion): Promise<void>;
  /** Inserta una publicación y su evidencia de imagen de forma atómica. */
  guardarConEvidencia(publicacion: Publicacion, imagenUrl: string): Promise<void>;
  actualizarConEvidencia(publicacion: Publicacion, imagenUrl: string): Promise<void>;
  buscarPorId(id: string): Promise<Publicacion | null>;
  listarGestion(autorId?: string): Promise<Publicacion[]>;
  eliminar(id: string): Promise<void>;
  listarPublicadas(filtro: Paginacion & { etiqueta?: string | undefined }): Promise<{ items: Publicacion[]; total: number }>;
  /** Etiquetas distintas de las publicaciones visibles (para los filtros de la web). */
  listarEtiquetasPublicadas(): Promise<string[]>;
  listarPorEstado(estado: Publicacion["estado"], limite: number): Promise<Publicacion[]>;
}
