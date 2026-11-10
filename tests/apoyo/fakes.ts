import type { Actor } from "../../src/shared/domain/actor.js";
import type { Publicacion } from "../../src/modules/publicacion/publicacion.entity.js";
import type { EtiquetaPublicacion } from "../../src/modules/publicacion/publicacion.entity.js";
import type { PublicacionRepository } from "../../src/modules/publicacion/publicacion.repository.js";
import type { UsuarioAutorizado } from "../../src/modules/usuario-autorizado/usuario-autorizado.entity.js";
import type { UsuarioAutorizadoRepository } from "../../src/modules/usuario-autorizado/usuario-autorizado.repository.js";

/**
 * Repositorios en memoria: implementan las MISMAS interfaces que los de Prisma.
 * Gracias a eso los services se prueban sin base de datos (beneficio directo de la arquitectura).
 */

export const directora: Actor = { id: "00000000-0000-4000-8000-000000000001", nombre: "Directora", rol: "DIRECTORA" };
export const comunicaciones: Actor = { id: "00000000-0000-4000-8000-000000000002", nombre: "Comunicaciones", rol: "COMUNICACIONES" };
export const colaborador: Actor = { id: "00000000-0000-4000-8000-000000000003", nombre: "Psicóloga", rol: "COLABORADOR" };

export class PublicacionRepositoryEnMemoria implements PublicacionRepository {
  readonly datos = new Map<string, Publicacion>();
  /** Imagen guardada por publicación (simula la tabla evidencia). */
  readonly imagenes = new Map<string, string>();

  async guardar(publicacion: Publicacion) {
    this.datos.set(publicacion.id, publicacion);
    const imagenUrl = publicacion.aProps().imagenUrl;
    if (imagenUrl) this.imagenes.set(publicacion.id, imagenUrl);
    else this.imagenes.delete(publicacion.id);
  }
  async buscarPorId(id: string) {
    return this.datos.get(id) ?? null;
  }
  async listarGestion(autorId?: string) {
    return [...this.datos.values()].filter(p => !autorId || p.autorId === autorId);
  }
  async eliminar(id: string) {
    this.datos.delete(id);
    this.imagenes.delete(id);
  }
  async listarPublicadas({
    pagina,
    limite,
    etiqueta,
  }: { pagina: number; limite: number; etiqueta?: EtiquetaPublicacion | undefined }) {
    const publicadas = [...this.datos.values()].filter(
      p => p.estaPublicada && (!etiqueta || p.aProps().etiqueta === etiqueta),
    );
    return { items: publicadas.slice((pagina - 1) * limite, pagina * limite), total: publicadas.length };
  }
  async listarHistorico({
    pagina,
    limite,
    etiqueta,
    busqueda,
  }: {
    pagina: number;
    limite: number;
    etiqueta?: EtiquetaPublicacion | undefined;
    busqueda?: string | undefined;
  }) {
    const publicadas = [...this.datos.values()]
      .filter(p => {
        const props = p.aProps();
        return p.estado === "PUBLICADA"
          && (!etiqueta || props.etiqueta === etiqueta)
          && (!busqueda || props.titulo.toLowerCase().includes(busqueda.toLowerCase()));
      })
      .sort((a, b) => {
        const fechaA = a.aProps().publicadaEn?.getTime() ?? Number.NEGATIVE_INFINITY;
        const fechaB = b.aProps().publicadaEn?.getTime() ?? Number.NEGATIVE_INFINITY;
        return fechaB - fechaA || a.id.localeCompare(b.id);
      });
    return { items: publicadas.slice((pagina - 1) * limite, pagina * limite), total: publicadas.length };
  }
  async listarEtiquetasPublicadas() {
    const etiquetas = [...this.datos.values()].filter(p => p.estaPublicada).map(p => p.aProps().etiqueta);
    return [...new Set(etiquetas.flatMap(etiqueta => (etiqueta ? [etiqueta] : [])))].sort();
  }
  async listarPorEstado(estado: Publicacion["estado"], limite: number) {
    return [...this.datos.values()].filter(p => p.estado === estado).slice(0, limite);
  }
}

export class UsuarioAutorizadoRepositoryEnMemoria implements UsuarioAutorizadoRepository {
  readonly datos = new Map<string, UsuarioAutorizado>();

  async guardar(usuario: UsuarioAutorizado) {
    this.datos.set(usuario.id, usuario);
  }
  async buscarPorTelegramId(telegramId: bigint) {
    return [...this.datos.values()].find(user => user.telegramId === telegramId) ?? null;
  }
  async buscarPorIdUsuarioExterno(idUsuarioExterno: bigint) {
    return [...this.datos.values()].find(user => user.idUsuarioExterno === idUsuarioExterno) ?? null;
  }
  async buscarPorId(id: string) {
    return [...this.datos.values()].find(user => user.aProps().id === id) ?? null;
  }
  async listar() {
    return [...this.datos.values()];
  }
}
