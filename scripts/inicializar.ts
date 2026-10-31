/**
 * Carga los datos mínimos para empezar (se puede ejecutar varias veces sin duplicar):
 *   - canal "web"
 *   - la primera directora en la lista blanca del bot (nadie más puede autorizarla)
 *
 * Uso:  npm run db:inicializar -- <telegramId> "<Nombre de la directora>"
 * (el telegramId se obtiene enviando /miid al bot)
 */
import { prisma } from "../src/config/prisma.js";
import { UsuarioAutorizado } from "../src/modules/usuario-autorizado/usuario-autorizado.entity.js";
import { PrismaUsuarioAutorizadoRepository } from "../src/modules/usuario-autorizado/usuario-autorizado.prisma.repository.js";

const [telegramIdTexto, ...partesNombre] = process.argv.slice(2);

try {
  await prisma.canal.upsert({
    where: { tipo: "web" },
    create: { tipo: "web", descripcion: "Página web de la fundación" },
    update: {},
  });
  console.log("OK: canal 'web'");

  if (telegramIdTexto && /^\d+$/.test(telegramIdTexto) && partesNombre.length > 0) {
    const repo = new PrismaUsuarioAutorizadoRepository(prisma);
    const telegramId = BigInt(telegramIdTexto);
    const existente = await repo.buscarPorTelegramId(telegramId);
    const directora = existente ?? UsuarioAutorizado.crear({ telegramId, nombre: partesNombre.join(" "), rol: "DIRECTORA" });
    directora.cambiarRol("DIRECTORA");
    directora.activar();
    await repo.guardar(directora);
    console.log(`OK: directora autorizada (${telegramIdTexto})`);
  } else {
    console.log('Para autorizar a la directora: npm run db:inicializar -- <telegramId> "<Nombre>"');
  }
} finally {
  await prisma.$disconnect();
}
