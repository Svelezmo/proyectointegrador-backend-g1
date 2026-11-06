import type { Actor } from "../../shared/domain/actor.js";
import { NoAutorizadoError, NoEncontradoError, ReglaDeNegocioError } from "../../shared/domain/errores.js";
import type { AutorizarUsuarioDto, UsuarioAutorizadoDto } from "./usuario-autorizado.dto.js";
import { UsuarioAutorizado } from "./usuario-autorizado.entity.js";
import { UsuarioAutorizadoMapper } from "./usuario-autorizado.mapper.js";
import type { UsuarioAutorizadoRepository } from "./usuario-autorizado.repository.js";

/**
 * SERVICE: autenticación por ID de Telegram y administración de la lista blanca.
 * Reemplaza al login con JWT: Telegram ya garantiza quién envía cada mensaje
 * (y el webhook se protege con TELEGRAM_WEBHOOK_SECRET).
 */
export class UsuarioAutorizadoService {
  constructor(private readonly usuarios: UsuarioAutorizadoRepository) {}

  /** Devuelve el Actor si el ID está en la lista blanca y activo; si no, lanza NoAutorizadoError. */
  async autenticarPorTelegram(telegramId: bigint): Promise<Actor> {
    const usuario = await this.usuarios.buscarPorTelegramId(telegramId);
    if (!usuario?.activo) throw new NoAutorizadoError("Tu cuenta de Telegram no está autorizada para usar UP News");
    return usuario.aActor();
  }

  /** Agrega o reactiva a alguien en la lista blanca. Solo la directora. */
  async autorizar(dto: AutorizarUsuarioDto, actor: Actor): Promise<UsuarioAutorizadoDto> {
    this.exigirDirectora(actor);
    const existente = await this.usuarios.buscarPorTelegramId(dto.telegramId);
    const usuario = existente ?? UsuarioAutorizado.crear(dto);
    if (existente) {
      existente.cambiarRol(dto.rol);
      existente.activar();
    }
    await this.usuarios.guardar(usuario);
    return UsuarioAutorizadoMapper.aDto(usuario);
  }

  /** Quita el acceso sin borrar el historial (sus publicaciones siguen apuntando a él). Solo la directora. */
  async revocar(telegramId: bigint, actor: Actor): Promise<UsuarioAutorizadoDto> {
    this.exigirDirectora(actor);
    const usuario = await this.usuarios.buscarPorTelegramId(telegramId);
    if (!usuario) throw new NoEncontradoError("No hay un usuario con ese ID de Telegram");
    if (usuario.id === actor.id) throw new NoAutorizadoError("No puedes revocar tu propio acceso");
    usuario.desactivar();
    await this.usuarios.guardar(usuario);
    return UsuarioAutorizadoMapper.aDto(usuario);
  }

  async listar(actor: Actor): Promise<UsuarioAutorizadoDto[]> {
    this.exigirDirectora(actor);
    return (await this.usuarios.listar()).map(UsuarioAutorizadoMapper.aDto);
  }

  async registrarColaborador(
    datos: { telegramId: bigint; nombre: string },
    actor: Actor,
  ): Promise<UsuarioAutorizadoDto> {
    this.exigirDirectora(actor);
    const existente = await this.usuarios.buscarPorTelegramId(datos.telegramId);
    if (existente?.activo) throw new ReglaDeNegocioError("Este usuario ya está registrado");
    const usuario = existente ?? UsuarioAutorizado.crear({ ...datos, rol: "COLABORADOR" });
    if (existente) {
      existente.cambiarNombre(datos.nombre);
      existente.cambiarRol("COLABORADOR");
      existente.activar();
    }
    await this.usuarios.guardar(usuario);
    return UsuarioAutorizadoMapper.aDto(usuario);
  }

  async actualizar(
    id: string,
    datos: { nombre?: string | undefined; activo?: boolean | undefined },
    actor: Actor,
  ): Promise<UsuarioAutorizadoDto> {
    this.exigirDirectora(actor);
    const usuario = await this.usuarios.buscarPorId(id);
    if (!usuario || usuario.rol !== "COLABORADOR") throw new NoEncontradoError("Colaborador no encontrado");
    if (usuario.id === actor.id && datos.activo === false) {
      throw new NoAutorizadoError("No puedes desactivar tu propio acceso");
    }
    if (datos.nombre !== undefined) usuario.cambiarNombre(datos.nombre);
    if (datos.activo === true) usuario.activar();
    if (datos.activo === false) usuario.desactivar();
    await this.usuarios.guardar(usuario);
    return UsuarioAutorizadoMapper.aDto(usuario);
  }

  private exigirDirectora(actor: Actor): void {
    if (actor.rol !== "DIRECTORA") throw new NoAutorizadoError("Solo la directora puede administrar usuarios");
  }
}
