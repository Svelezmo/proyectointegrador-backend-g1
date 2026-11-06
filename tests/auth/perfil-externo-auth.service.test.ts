import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { PerfilExternoAuthService } from "../../src/modules/auth/perfil-externo-auth.service.js";
import {
  NoAutenticadoError,
  NoAutorizadoError,
  ServicioAutenticacionExternaError,
} from "../../src/shared/domain/errores.js";
import { UsuarioAutorizadoRepositoryEnMemoria } from "../apoyo/fakes.js";

const PERFIL = {
  id_usuario: 123,
  correo_usuario: "usuario@example.com",
  nombres: "Nombre",
  apellidos: "Usuario",
  roles: [{ id_rol: 1, nombre_rol: "ADMIN" }],
};

describe("PerfilExternoAuthService", () => {
  test("consulta el perfil con Bearer y mapea ADMIN a DIRECTORA", async () => {
    const usuarios = new UsuarioAutorizadoRepositoryEnMemoria();
    let encabezado: string | null = null;
    const service = new PerfilExternoAuthService(usuarios, "https://auth.example.com/api/auth/perfil", async (_url, init) => {
      encabezado = new Headers(init?.headers).get("Authorization");
      return Response.json(PERFIL);
    });

    const actor = await service.autenticar("jwt-de-prueba");
    const usuarioGuardado = await usuarios.buscarPorIdUsuarioExterno(123n);

    assert.equal(encabezado, "Bearer jwt-de-prueba");
    assert.equal(actor.rol, "DIRECTORA");
    assert.equal(actor.nombre, "Nombre Usuario");
    assert.equal(usuarioGuardado?.telegramId, null);
    assert.equal(usuarioGuardado?.idUsuarioExterno, 123n);

    const segundoActor = await service.autenticar("otro-jwt");
    assert.equal(segundoActor.id, actor.id);
  });

  test("mapea TALLERISTA a COLABORADOR y rechaza otros roles", async () => {
    const usuarios = new UsuarioAutorizadoRepositoryEnMemoria();
    const service = new PerfilExternoAuthService(usuarios, "https://auth.example.com/perfil", async () =>
      Response.json({ ...PERFIL, roles: [{ nombre_rol: "TALLERISTA" }] }),
    );
    assert.equal((await service.autenticar("token")).rol, "COLABORADOR");

    const sinPermiso = new PerfilExternoAuthService(usuarios, "https://auth.example.com/perfil", async () =>
      Response.json({ ...PERFIL, id_usuario: 456, roles: [{ nombre_rol: "ESTUDIANTE" }] }),
    );
    await assert.rejects(sinPermiso.autenticar("token"), NoAutorizadoError);
  });

  test("devuelve error de autenticación cuando el token expiró", async () => {
    const service = new PerfilExternoAuthService(new UsuarioAutorizadoRepositoryEnMemoria(), "https://auth.example.com/perfil", async () =>
      Response.json({ error: "Token inválido o expirado" }, { status: 401 }),
    );
    await assert.rejects(service.autenticar("token"), NoAutenticadoError);
  });

  test("no permite acceso si el perfil no está disponible o no tiene formato válido", async () => {
    const unavailable = new PerfilExternoAuthService(
      new UsuarioAutorizadoRepositoryEnMemoria(),
      "https://auth.example.com/perfil",
      async () => Response.json({}, { status: 503 }),
    );
    await assert.rejects(unavailable.autenticar("token"), ServicioAutenticacionExternaError);

    const invalid = new PerfilExternoAuthService(
      new UsuarioAutorizadoRepositoryEnMemoria(),
      "https://auth.example.com/perfil",
      async () => Response.json({ id_usuario: "no-numérico" }),
    );
    await assert.rejects(invalid.autenticar("token"), ServicioAutenticacionExternaError);
  });
});
