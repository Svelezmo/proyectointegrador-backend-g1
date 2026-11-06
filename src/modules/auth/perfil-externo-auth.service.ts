import { createHash } from "node:crypto";
import { z } from "zod";
import type { Actor, Rol } from "../../shared/domain/actor.js";
import {
  NoAutenticadoError,
  NoAutorizadoError,
  ServicioAutenticacionExternaError,
} from "../../shared/domain/errores.js";
import type { AutenticacionWebPort } from "./autenticacion-web.port.js";
import { UsuarioAutorizado } from "../usuario-autorizado/usuario-autorizado.entity.js";
import type { UsuarioAutorizadoRepository } from "../usuario-autorizado/usuario-autorizado.repository.js";

const perfilExternoDto = z.object({
  id_usuario: z.number().int().positive().safe(),
  nombres: z.string(),
  apellidos: z.string(),
  roles: z.array(z.object({ nombre_rol: z.string() })),
}).passthrough();

type FetchPerfil = (input: string, init?: RequestInit) => Promise<Response>;

export interface OpcionesPerfilExterno {
  /** Cuánto tiempo se reutiliza un token ya validado. 0 desactiva la caché. */
  cacheMs?: number;
  /** Tiempo máximo esperando al backend principal (en Render gratuito puede tardar en despertar). */
  timeoutMs?: number;
  /** Reloj inyectable para pruebas. */
  ahora?: () => number;
}

const MAXIMO_TOKENS_EN_CACHE = 500;

/**
 * Valida el Bearer de la web contra el backend principal (/api/auth/perfil) y lo traduce a un Actor.
 *
 * Para no depender de ese servidor en CADA petición, un token válido se recuerda durante `cacheMs`
 * (60 s por defecto). Solo se guarda el hash SHA-256 del token, nunca el token en claro.
 */
export class PerfilExternoAuthService implements AutenticacionWebPort {
  private readonly cache = new Map<string, { actor: Actor; expiraEn: number }>();
  private readonly cacheMs: number;
  private readonly timeoutMs: number;
  private readonly ahora: () => number;

  constructor(
    private readonly usuarios: UsuarioAutorizadoRepository,
    private readonly perfilUrl: string,
    private readonly solicitarPerfil: FetchPerfil = fetch,
    opciones: OpcionesPerfilExterno = {},
  ) {
    this.cacheMs = opciones.cacheMs ?? 60_000;
    this.timeoutMs = opciones.timeoutMs ?? 30_000;
    this.ahora = opciones.ahora ?? Date.now;
  }

  async autenticar(token: string): Promise<Actor> {
    const clave = createHash("sha256").update(token).digest("hex");
    const enCache = this.cache.get(clave);
    if (enCache && enCache.expiraEn > this.ahora()) return enCache.actor;
    this.cache.delete(clave);

    const actor = await this.validarConBackendPrincipal(token);
    this.recordar(clave, actor);
    return actor;
  }

  private async validarConBackendPrincipal(token: string): Promise<Actor> {
    let respuesta: Response;
    try {
      respuesta = await this.solicitarPerfil(this.perfilUrl, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        signal: AbortSignal.timeout(this.timeoutMs),
        redirect: "error",
      });
    } catch {
      throw new ServicioAutenticacionExternaError("No se pudo consultar el servicio de autenticación");
    }

    if (respuesta.status === 401 || respuesta.status === 403) {
      throw new NoAutenticadoError("El token es inválido o ha expirado");
    }
    if (!respuesta.ok) {
      throw new ServicioAutenticacionExternaError("El servicio de autenticación no pudo validar la sesión");
    }

    let cuerpo: unknown;
    try {
      cuerpo = await respuesta.json();
    } catch {
      throw new ServicioAutenticacionExternaError("El servicio de autenticación devolvió una respuesta inválida");
    }

    const perfil = perfilExternoDto.safeParse(cuerpo);
    if (!perfil.success) {
      throw new ServicioAutenticacionExternaError("El servicio de autenticación devolvió un perfil inválido");
    }

    const nombresRoles = new Set(perfil.data.roles.map(rol => rol.nombre_rol.trim().toUpperCase()));
    const rol: Rol | undefined = nombresRoles.has("ADMIN")
      ? "DIRECTORA"
      : nombresRoles.has("TALLERISTA")
        ? "COLABORADOR"
        : undefined;
    if (!rol) throw new NoAutorizadoError("El usuario no tiene un rol autorizado para UP News");

    const idUsuarioExterno = BigInt(perfil.data.id_usuario);
    const nombre = `${perfil.data.nombres} ${perfil.data.apellidos}`.trim();
    if (!nombre) {
      throw new ServicioAutenticacionExternaError("El perfil no contiene un nombre válido");
    }
    const existente = await this.usuarios.buscarPorIdUsuarioExterno(idUsuarioExterno);
    if (existente && !existente.activo) {
      throw new NoAutorizadoError("El acceso de este usuario está desactivado en UP News");
    }
    // Solo se escribe en la base si el usuario es nuevo o cambió su nombre o rol.
    if (!existente) {
      const nuevo = UsuarioAutorizado.crear({ idUsuarioExterno, nombre, rol });
      await this.usuarios.guardar(nuevo);
      return nuevo.aActor();
    }
    if (existente.sincronizarPerfilWeb(nombre, rol)) await this.usuarios.guardar(existente);
    return existente.aActor();
  }

  private recordar(clave: string, actor: Actor): void {
    if (this.cacheMs <= 0) return;
    if (this.cache.size >= MAXIMO_TOKENS_EN_CACHE) {
      // Quita la entrada más antigua (los Map conservan el orden de inserción).
      const masAntigua = this.cache.keys().next().value;
      if (masAntigua !== undefined) this.cache.delete(masAntigua);
    }
    this.cache.set(clave, { actor, expiraEn: this.ahora() + this.cacheMs });
  }
}
