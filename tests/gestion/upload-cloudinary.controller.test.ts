import assert from "node:assert/strict";
import { once } from "node:events";
import { describe, test } from "node:test";
import type { Server } from "node:http";
import type { Actor } from "../../src/shared/domain/actor.js";
import { crearApp } from "../../src/app.js";
import { GestionController } from "../../src/modules/gestion/gestion.controller.js";
import { InformacionContactoService } from "../../src/modules/contacto/informacion-contacto.service.js";
import { PublicacionController } from "../../src/modules/publicacion/publicacion.controller.js";
import { PublicacionService } from "../../src/modules/publicacion/publicacion.service.js";
import { UsuarioAutorizadoService } from "../../src/modules/usuario-autorizado/usuario-autorizado.service.js";
import { NoAutenticadoError } from "../../src/shared/domain/errores.js";
import { PublicacionRepositoryEnMemoria, UsuarioAutorizadoRepositoryEnMemoria } from "../apoyo/fakes.js";

const actor: Actor = {
  id: "00000000-0000-4000-8000-000000000001",
  nombre: "Tallerista",
  rol: "COLABORADOR",
};

const firma = {
  apiKey: "cloudinary-key",
  cloudName: "upnews",
  folder: "upnews",
  publicId: "imagen-prueba",
  signature: "firma-prueba",
  timestamp: 1_800_000_000,
  overwrite: false as const,
};

async function iniciarServidor(conCloudinary: boolean): Promise<Server> {
  const usuarios = new UsuarioAutorizadoRepositoryEnMemoria();
  const publicaciones = new PublicacionService(new PublicacionRepositoryEnMemoria());
  const auth = {
    async autenticar(token: string): Promise<Actor> {
      if (token !== "token-valido") throw new NoAutenticadoError("Token inválido");
      return actor;
    },
  };
  const contactos = new InformacionContactoService({
    async listar() { return []; },
    async buscarPorId() { return null; },
    async guardar() {},
    async eliminar() {},
  });
  const almacenamiento = conCloudinary
    ? {
        crearFirmaSubidaImagen: () => firma,
        perteneceAEsteAlmacenamiento: () => true,
      }
    : undefined;
  const app = crearApp({
    publicacionController: new PublicacionController(publicaciones),
    gestionController: new GestionController(
      auth,
      publicaciones,
      new UsuarioAutorizadoService(usuarios),
      contactos,
      almacenamiento,
      {
        async autenticar(initData: string): Promise<Actor> {
          if (initData !== "init-data-valido") throw new NoAutenticadoError("Sesión de Telegram inválida");
          return actor;
        },
      },
    ),
    verificarSalud: async () => {},
    corsOrigins: [],
    trustProxyHops: 0,
  });
  const server = app.listen(0);
  await once(server, "listening");
  return server;
}

async function cerrarServidor(server: Server): Promise<void> {
  server.close();
  await once(server, "close");
}

function urlServidor(server: Server): string {
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No se pudo determinar el puerto de prueba");
  return `http://127.0.0.1:${address.port}`;
}

describe("POST /api/gestion/upload-signature", () => {
  test("requiere token Bearer y devuelve una firma con Cloudinary configurado", async () => {
    const server = await iniciarServidor(true);
    try {
      const baseUrl = urlServidor(server);
      const sinToken = await fetch(`${baseUrl}/api/gestion/upload-signature`, { method: "POST" });
      assert.equal(sinToken.status, 401);

      const respuesta = await fetch(`${baseUrl}/api/gestion/upload-signature`, {
        method: "POST",
        headers: { Authorization: "Bearer token-valido" },
      });
      assert.equal(respuesta.status, 200);
      assert.deepEqual(await respuesta.json(), firma);

      const respuestaTelegram = await fetch(`${baseUrl}/api/gestion/upload-signature`, {
        method: "POST",
        headers: { "X-Telegram-Init-Data": "init-data-valido" },
      });
      assert.equal(respuestaTelegram.status, 200);
      assert.deepEqual(await respuestaTelegram.json(), firma);
    } finally {
      await cerrarServidor(server);
    }
  });

  test("rechaza un Bearer inválido aunque se envíe una sesión de Telegram válida", async () => {
    const server = await iniciarServidor(true);
    try {
      const respuesta = await fetch(`${urlServidor(server)}/api/gestion/upload-signature`, {
        method: "POST",
        headers: {
          Authorization: "Bearer token-invalido",
          "X-Telegram-Init-Data": "init-data-valido",
        },
      });
      assert.equal(respuesta.status, 401);
    } finally {
      await cerrarServidor(server);
    }
  });

  test("responde 503 si Cloudinary no está configurado", async () => {
    const server = await iniciarServidor(false);
    try {
      const respuesta = await fetch(`${urlServidor(server)}/api/gestion/upload-signature`, {
        method: "POST",
        headers: { Authorization: "Bearer token-valido" },
      });
      assert.equal(respuesta.status, 503);
      assert.deepEqual(await respuesta.json(), {
        error: "La subida de imágenes no está configurada",
        codigo: "SERVICIO_NO_DISPONIBLE",
      });
    } finally {
      await cerrarServidor(server);
    }
  });
});
