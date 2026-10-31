import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { PrismaCanalRepository } from "./modules/canal/canal.repository.js";
import { PublicacionController } from "./modules/publicacion/publicacion.controller.js";
import { PrismaPublicacionRepository } from "./modules/publicacion/publicacion.prisma.repository.js";
import { PublicacionService } from "./modules/publicacion/publicacion.service.js";
import { crearBot } from "./modules/telegram/telegram.bot.js";
import { PrismaUsuarioAutorizadoRepository } from "./modules/usuario-autorizado/usuario-autorizado.prisma.repository.js";
import { UsuarioAutorizadoService } from "./modules/usuario-autorizado/usuario-autorizado.service.js";

/**
 * COMPOSITION ROOT (inyección de dependencias manual).
 * Es el ÚNICO lugar donde se decide qué implementación concreta usa cada pieza:
 *   repository (Prisma) -> service -> controller / bot
 * Para probar o cambiar una implementación, se cambia aquí y nada más.
 */

// Repositories (infraestructura)
const publicacionRepository = new PrismaPublicacionRepository(prisma);
const canalRepository = new PrismaCanalRepository(prisma);
const usuarioAutorizadoRepository = new PrismaUsuarioAutorizadoRepository(prisma);

// Services (casos de uso)
const publicacionService = new PublicacionService(publicacionRepository, canalRepository);
const usuarioAutorizadoService = new UsuarioAutorizadoService(usuarioAutorizadoRepository);

// Entradas: controllers HTTP y bot de Telegram
const publicacionController = new PublicacionController(publicacionService);
const bot = env.TELEGRAM_BOT_TOKEN
  ? crearBot(env.TELEGRAM_BOT_TOKEN, { usuarios: usuarioAutorizadoService, publicaciones: publicacionService })
  : null;

export const contenedor = {
  publicacionService,
  usuarioAutorizadoService,
  publicacionController,
  bot,
};
