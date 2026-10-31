import type { Actor } from "../../src/shared/domain/actor.js";
import type { CanalRepository } from "../../src/modules/canal/canal.repository.js";
import type { Publicacion } from "../../src/modules/publicacion/publicacion.entity.js";
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

export const CANAL_WEB_ID = "00000000-0000-4000-8000-0000000000aa";

export class PublicacionRepositoryEnMemoria implements PublicacionRepository {
  readonly datos = new Map<string, Publicacion>();

  async guardar(publicacion: Publicacion) {
    this.datos.set(publicacion.id, publicacion);
  }
  async buscarPorId(id: string) {
    return this.datos.get(id) ?? null;
  }
  async listarPublicadas({ pagina, limite, etiqueta }: { pagina: number; limite: number; etiqueta?: string | undefined }) {
    const publicadas = [...this.datos.values()].filter(
      p => p.estaPublicada && (!etiqueta || p.aProps().etiqueta?.toLowerCase() === etiqueta.toLowerCase()),
    );
    return { items: publicadas.slice((pagina - 1) * limite, pagina * limite), total: publicadas.length };
  }
  async listarEtiquetasPublicadas() {
    const etiquetas = [...this.datos.values()].filter(p => p.estaPublicada).map(p => p.aProps().etiqueta);
    return [...new Set(etiquetas.filter((e): e is string => e !== null))].sort();
  }
  async listarPorEstado(estado: Publicacion["estado"], limite: number) {
    return [...this.datos.values()].filter(p => p.estado === estado).slice(0, limite);
  }
}

export class CanalRepositoryEnMemoria implements CanalRepository {
  async buscarIdActivoPorTipo(tipo: string) {
    return tipo === "web" ? CANAL_WEB_ID : null;
  }
}

export class UsuarioAutorizadoRepositoryEnMemoria implements UsuarioAutorizadoRepository {
  readonly datos = new Map<bigint, UsuarioAutorizado>();

  async guardar(usuario: UsuarioAutorizado) {
    this.datos.set(usuario.telegramId, usuario);
  }
  async buscarPorTelegramId(telegramId: bigint) {
    return this.datos.get(telegramId) ?? null;
  }
  async listar() {
    return [...this.datos.values()];
  }
}
