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

export class PerfilExternoAuthService implements AutenticacionWebPort {
  constructor(
    private readonly usuarios: UsuarioAutorizadoRepository,
    private readonly perfilUrl: string,
    private readonly solicitarPerfil: FetchPerfil = fetch,
  ) {}

  async autenticar(token: string): Promise<Actor> {
    let respuesta: Response;
    try {
      respuesta = await this.solicitarPerfil(this.perfilUrl, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
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
    let usuario = await this.usuarios.buscarPorIdUsuarioExterno(idUsuarioExterno);
    if (usuario && !usuario.activo) {
      throw new NoAutorizadoError("El acceso de este usuario está desactivado en UP News");
    }
    if (usuario) {
      usuario.sincronizarPerfilWeb(nombre, rol);
    } else {
      usuario = UsuarioAutorizado.crear({ idUsuarioExterno, nombre, rol });
    }
    await this.usuarios.guardar(usuario);
    return usuario.aActor();
  }
}
