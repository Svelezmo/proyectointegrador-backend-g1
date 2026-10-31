import { webhookCallback, type Bot } from "grammy";
import type { RequestHandler } from "express";
import { COMANDOS_MENU } from "./telegram.bot.js";
import type { ContextoUpNews } from "./telegram.contexto.js";

export const RUTA_WEBHOOK = "/telegram/webhook";

/**
 * Handler de Express para el webhook. grammY rechaza (401) cualquier petición
 * que no traiga el header X-Telegram-Bot-Api-Secret-Token correcto.
 */
export function crearHandlerWebhook(bot: Bot<ContextoUpNews>, secretToken: string): RequestHandler {
  return webhookCallback(bot, "express", { secretToken });
}

/**
 * Dos modos de funcionamiento:
 * - Producción (hay PUBLIC_URL): registra el webhook en Telegram -> Telegram llama a POST /telegram/webhook.
 * - Desarrollo (sin PUBLIC_URL): long polling -> el backend pregunta a Telegram; no necesita URL pública.
 */
export async function iniciarBot(
  bot: Bot<ContextoUpNews>,
  opciones: { publicUrl?: string | undefined; secretToken?: string | undefined },
): Promise<void> {
  await bot.init(); // valida el token (getMe) antes de recibir el primer update
  await bot.api.setMyCommands(COMANDOS_MENU);
  if (opciones.publicUrl && opciones.secretToken) {
    await bot.api.setWebhook(new URL(RUTA_WEBHOOK, opciones.publicUrl).toString(), {
      secret_token: opciones.secretToken,
      allowed_updates: ["message"],
    });
    console.log("Bot de Telegram en modo webhook");
    return;
  }
  await bot.api.deleteWebhook();
  void bot.start({ allowed_updates: ["message"], onStart: info => console.log(`Bot @${info.username} en modo long polling`) });
}
