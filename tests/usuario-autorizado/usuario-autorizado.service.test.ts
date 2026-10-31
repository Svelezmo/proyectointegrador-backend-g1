import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { UsuarioAutorizadoService } from "../../src/modules/usuario-autorizado/usuario-autorizado.service.js";
import { NoAutorizadoError } from "../../src/shared/domain/errores.js";
import { colaborador, directora, UsuarioAutorizadoRepositoryEnMemoria } from "../apoyo/fakes.js";

describe("UsuarioAutorizadoService", () => {
  let service: UsuarioAutorizadoService;

  beforeEach(() => {
    service = new UsuarioAutorizadoService(new UsuarioAutorizadoRepositoryEnMemoria());
  });

  test("un ID que no está en la lista blanca no pasa", async () => {
    await assert.rejects(service.autenticarPorTelegram(123n), NoAutorizadoError);
  });

  test("la directora autoriza y luego revoca; el revocado ya no pasa", async () => {
    await service.autorizar({ telegramId: 555n, nombre: "Ana", rol: "COLABORADOR" }, directora);
    const actor = await service.autenticarPorTelegram(555n);
    assert.equal(actor.rol, "COLABORADOR");

    await service.revocar(555n, directora);
    await assert.rejects(service.autenticarPorTelegram(555n), NoAutorizadoError);
  });

  test("solo la directora puede autorizar", async () => {
    await assert.rejects(
      service.autorizar({ telegramId: 777n, nombre: "Luis", rol: "DIRECTORA" }, colaborador),
      NoAutorizadoError,
    );
  });
});
