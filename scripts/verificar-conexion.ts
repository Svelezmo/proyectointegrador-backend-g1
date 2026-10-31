/**
 * Verifica .env y la conexión a la base de UP News sin levantar el servidor.
 * Uso: npm run check:config
 */
try {
  const { env } = await import("../src/config/env.js");
  const url = new URL(env.DATABASE_URL);
  console.log(`Destino: ${url.hostname}:${url.port} (pgbouncer=${url.searchParams.get("pgbouncer") ?? "no"})`);
  console.log(`Bot de Telegram: ${env.TELEGRAM_BOT_TOKEN ? (env.PUBLIC_URL ? "webhook" : "long polling") : "desactivado"}`);
  console.log(`Supabase (Storage): ${env.SUPABASE_URL && env.SUPABASE_ANON_KEY ? "configurado" : "sin configurar"}`);

  const { prisma } = await import("../src/config/prisma.js");
  try {
    const [{ tablas }] = await prisma.$queryRaw<[{ tablas: bigint }]>`
      SELECT count(*) AS tablas FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN
        ('usuario_autorizado','canal','publicacion','evidencia','publicacion_evidencia','metrica_publicacion','informacion_contacto')`;
    console.log(`OK: conexión establecida. Tablas de UP News encontradas: ${tablas}/7`);
    if (tablas < 7n) console.log("Falta aplicar las migraciones: npm run db:migrate");
  } finally {
    await prisma.$disconnect();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
