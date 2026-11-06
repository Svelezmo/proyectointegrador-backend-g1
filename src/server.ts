import { crearApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma, verificarBaseDeDatos } from "./config/prisma.js";
import { contenedor } from "./contenedor.js";
import { crearHandlerWebhook, iniciarBot } from "./modules/telegram/telegram.iniciar.js";

/** Punto de entrada: verifica la base, levanta HTTP y arranca el bot. */
const { bot } = contenedor;
const usarWebhook = Boolean(bot && env.PUBLIC_URL && env.TELEGRAM_WEBHOOK_SECRET);

const app = crearApp({
  publicacionController: contenedor.publicacionController,
  contactoController: contenedor.contactoController,
  telegramAuthController: contenedor.telegramAuthController,
  miniAppController: contenedor.miniAppController,
  gestionController: contenedor.gestionController,
  verificarSalud: verificarBaseDeDatos,
  webhookTelegram: usarWebhook && bot && env.TELEGRAM_WEBHOOK_SECRET ? crearHandlerWebhook(bot, env.TELEGRAM_WEBHOOK_SECRET) : undefined,
  corsOrigins: env.CORS_ORIGINS,
  trustProxyHops: env.TRUST_PROXY_HOPS,
});

try {
  await verificarBaseDeDatos();
} catch (error) {
  console.error("No se pudo conectar a la base de datos. Revise DATABASE_URL y la contraseña.", error instanceof Error ? error.message : "");
  await prisma.$disconnect();
  process.exit(1);
}

if (bot) {
  try {
    await iniciarBot(bot, { publicUrl: env.PUBLIC_URL, secretToken: env.TELEGRAM_WEBHOOK_SECRET });
  } catch (error) {
    console.error("No se pudo iniciar el bot de Telegram:", error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exit(1);
  }
} else {
  console.warn("TELEGRAM_BOT_TOKEN no configurado: el bot está desactivado (la API funciona igual).");
}

const server = app.listen(env.PORT, env.HOST, () => {
  console.log(`UP News backend en http://${env.HOST}:${env.PORT}`);
});

async function apagar(): Promise<void> {
  if (bot?.isRunning()) await bot.stop();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.once("SIGINT", apagar);
process.once("SIGTERM", apagar);
