import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, test } from "node:test";
import { TelegramStatelessSessionProvider } from "../../src/modules/auth/telegram-stateless-session.provider.js";
import { TelegramCryptoService } from "../../src/modules/telegram/telegram-crypto.service.js";
import { TelegramMiniAppAuthService } from "../../src/modules/telegram/telegram-miniapp-auth.service.js";
import { UsuarioAutorizado } from "../../src/modules/usuario-autorizado/usuario-autorizado.entity.js";
import { UsuarioAutorizadoService } from "../../src/modules/usuario-autorizado/usuario-autorizado.service.js";
import { NoAutorizadoError } from "../../src/shared/domain/errores.js";
import { UsuarioAutorizadoRepositoryEnMemoria } from "../apoyo/fakes.js";

const TOKEN = "bot-token-for-tests";
const TELEGRAM_ID = 123456789;

function initData(fechaAuth = Math.floor(Date.now() / 1000)): string {
  const parametros = new URLSearchParams({
    auth_date: String(fechaAuth),
    user: JSON.stringify({ id: TELEGRAM_ID, first_name: "Usuario" }),
  });
  const cadenaVerificacion = [...parametros.entries()]
    .sort(([claveA], [claveB]) => (claveA < claveB ? -1 : claveA > claveB ? 1 : 0))
    .map(([clave, valor]) => `${clave}=${valor}`)
    .join("\n");
  const claveSecreta = createHmac("sha256", "WebAppData").update(TOKEN).digest();
  const hash = createHmac("sha256", claveSecreta).update(cadenaVerificacion).digest("hex");
  parametros.set("hash", hash);
  return parametros.toString();
}

describe("TelegramMiniAppAuthService", () => {
  test("valida initData y autentica al usuario autorizado", async () => {
    const repositorio = new UsuarioAutorizadoRepositoryEnMemoria();
    const usuario = UsuarioAutorizado.crear({
      telegramId: BigInt(TELEGRAM_ID),
      nombre: "Usuario",
      rol: "COLABORADOR",
    });
    await repositorio.guardar(usuario);
    const autenticacion = new TelegramMiniAppAuthService(
      new TelegramCryptoService(TOKEN),
      new UsuarioAutorizadoService(repositorio),
      new TelegramStatelessSessionProvider(),
    );

    const actor = await autenticacion.autenticar(initData());
    const sesion = await autenticacion.iniciarSesion(initData());

    assert.equal(actor.id, usuario.id);
    assert.equal(sesion.authenticated, true);
    assert.equal(sesion.actor.id, usuario.id);
  });

  test("rechaza datos alterados, expirados y usuarios no autorizados", async () => {
    const autenticacion = new TelegramMiniAppAuthService(
      new TelegramCryptoService(TOKEN),
      new UsuarioAutorizadoService(new UsuarioAutorizadoRepositoryEnMemoria()),
      new TelegramStatelessSessionProvider(),
    );
    const validoPeroNoAutorizado = initData();
    const alterado = validoPeroNoAutorizado.replace("Usuario", "Intruso");
    const expirado = initData(Math.floor(Date.now() / 1000) - 25 * 60 * 60);

    await assert.rejects(autenticacion.autenticar(alterado), NoAutorizadoError);
    await assert.rejects(autenticacion.autenticar(expirado), NoAutorizadoError);
    await assert.rejects(autenticacion.autenticar(validoPeroNoAutorizado), NoAutorizadoError);
  });

  test("devuelve datos tipados únicamente tras validar la firma", () => {
    const datos = new TelegramCryptoService(TOKEN).validar(initData());

    assert.equal(datos.telegramId, BigInt(TELEGRAM_ID));
    assert.equal(Number.isSafeInteger(datos.authDate), true);
  });
});
