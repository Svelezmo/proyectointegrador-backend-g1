import type { Composer } from "grammy";
import type { ContextoUpNews } from "../telegram.contexto.js";

export const AYUDA = [
  "UP News — comandos disponibles",
  "",
  "Publicaciones",
  "/nueva Título | Cuerpo | etiqueta(opcional) — crea un borrador",
  "/enviar <id> — envía tu borrador a aprobación",
  "/publicar <id> — aprueba y publica (solo directora)",
  "/archivar <id> — retira una publicación",
  "/pendientes — publicaciones esperando aprobación",
  "/ultimas — últimas publicaciones visibles en la web",
  "",
  "Usuarios (directora)",
  "/autorizar <telegramId> <ROL> <nombre> — ROL: DIRECTORA, COMUNICACIONES o COLABORADOR",
  "/revocar <telegramId>",
  "/usuarios",
  "",
  "/miid — muestra tu ID de Telegram",
].join("\n");

/** Comandos que no requieren estar autorizado. Se registran ANTES del middleware de autenticación. */
export function registrarComandosPublicos(bot: Composer<ContextoUpNews>): void {
  const privado = bot.chatType("private");

  privado.command("start", ctx =>
    ctx.reply("Hola, soy el bot de UP News de la Fundación Asisco Up.\nEnvía /ayuda para ver lo que puedo hacer."),
  );
  privado.command("ayuda", ctx => ctx.reply(AYUDA));
  privado.command("miid", ctx => ctx.reply(`Tu ID de Telegram es: ${ctx.from.id}`));
}
