import type { Actor } from "../../shared/domain/actor.js";
import { NoEncontradoError, ValidacionError } from "../../shared/domain/errores.js";
import type { Pagina } from "../../shared/domain/paginacion.js";
import type { CanalRepository } from "../canal/canal.repository.js";
import type {
  CrearPublicacionDto,
  EditarPublicacionDto,
  ListarPublicacionesDto,
  PublicacionInternaDto,
  PublicacionPublicaDto,
} from "./publicacion.dto.js";
import { Publicacion, type EstadoPublicacion } from "./publicacion.entity.js";
import { PublicacionMapper } from "./publicacion.mapper.js";
import type { PublicacionRepository } from "./publicacion.repository.js";

/**
 * SERVICE: los casos de uso del módulo. Orquesta, pero no decide reglas:
 *   1. recibe un DTO ya validado y el Actor que hace la acción,
 *   2. carga entidades con el repository,
 *   3. le pide a la entity que aplique la regla (publicar, editar...),
 *   4. guarda y devuelve un DTO de respuesta usando el mapper.
 * No sabe si lo llamó un controlador HTTP o un comando de Telegram.
 */
export class PublicacionService {
  constructor(
    private readonly publicaciones: PublicacionRepository,
    private readonly canales: CanalRepository,
  ) {}

  // ── Casos de uso públicos (página web) ───────────────────

  async listarPublicadas(filtro: ListarPublicacionesDto): Promise<Pagina<PublicacionPublicaDto>> {
    const { items, total } = await this.publicaciones.listarPublicadas(filtro);
    return { items: items.map(PublicacionMapper.aPublicaDto), total, pagina: filtro.pagina, limite: filtro.limite };
  }

  async obtenerPublicada(id: string): Promise<PublicacionPublicaDto> {
    const publicacion = await this.publicaciones.buscarPorId(id);
    if (!publicacion?.estaPublicada) throw new NoEncontradoError("Publicación no encontrada");
    return PublicacionMapper.aPublicaDto(publicacion);
  }

  async listarEtiquetas(): Promise<string[]> {
    return this.publicaciones.listarEtiquetasPublicadas();
  }

  // ── Casos de uso internos (bot de Telegram) ──────────────

  async crear(dto: CrearPublicacionDto, actor: Actor): Promise<PublicacionInternaDto> {
    const canalId = await this.canales.buscarIdActivoPorTipo(dto.canal);
    if (!canalId) throw new ValidacionError(`El canal "${dto.canal}" no existe o está inactivo`, ["canal"]);
    const publicacion = Publicacion.crear({ ...dto, canalId }, actor);
    await this.publicaciones.guardar(publicacion);
    return PublicacionMapper.aInternaDto(publicacion);
  }

  async editar(id: string, dto: EditarPublicacionDto, actor: Actor): Promise<PublicacionInternaDto> {
    return this.modificar(id, publicacion => publicacion.editar(dto, actor));
  }

  async enviarAAprobacion(id: string, actor: Actor): Promise<PublicacionInternaDto> {
    return this.modificar(id, publicacion => publicacion.enviarAAprobacion(actor));
  }

  async publicar(id: string, actor: Actor): Promise<PublicacionInternaDto> {
    return this.modificar(id, publicacion => publicacion.publicar(actor));
  }

  async archivar(id: string, actor: Actor): Promise<PublicacionInternaDto> {
    return this.modificar(id, publicacion => publicacion.archivar(actor));
  }

  async listarPorEstado(estado: EstadoPublicacion, limite = 10): Promise<PublicacionInternaDto[]> {
    const items = await this.publicaciones.listarPorEstado(estado, limite);
    return items.map(PublicacionMapper.aInternaDto);
  }

  /** Patrón común: cargar -> aplicar regla de la entity -> guardar -> responder. */
  private async modificar(id: string, accion: (publicacion: Publicacion) => void): Promise<PublicacionInternaDto> {
    const publicacion = await this.publicaciones.buscarPorId(id);
    if (!publicacion) throw new NoEncontradoError("Publicación no encontrada");
    accion(publicacion);
    await this.publicaciones.guardar(publicacion);
    return PublicacionMapper.aInternaDto(publicacion);
  }
}
