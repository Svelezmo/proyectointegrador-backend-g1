import "dotenv/config";
import { z } from "zod";

/**
 * Única fuente de verdad de la configuración.
 * Se valida una sola vez al arrancar: si falta algo, el proceso falla con un mensaje claro
 * en lugar de romperse más adelante en una petición.
 */
const listaDeOrigenes = z
  .string()
  .default("")
  .transform(valor => valor.split(",").map(origen => origen.trim()).filter(Boolean))
  .pipe(z.array(z.url({ protocol: /^https?$/ })));

const esquemaEnv = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  CORS_ORIGINS: listaDeOrigenes,

  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  DIRECT_URL: z.url({ protocol: /^postgres(ql)?$/ }).optional(),

  SUPABASE_URL: z.url({ protocol: /^https$/ }).optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),

  // El bot es opcional para poder levantar la API sin haber creado el bot todavía.
  TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
  TELEGRAM_WEBHOOK_SECRET: z
    .string()
    .regex(/^[A-Za-z0-9_-]{16,256}$/, "Use 16-256 caracteres: letras, números, _ o -")
    .optional(),
  // URL pública del backend (ej: https://upnews.onrender.com). Si falta, el bot usa long polling en desarrollo.
  PUBLIC_URL: z.url({ protocol: /^https$/ }).optional(),
});

export type Env = z.infer<typeof esquemaEnv>;

export function leerEnv(fuente: NodeJS.ProcessEnv = process.env): Env {
  // Las variables vacías del .env ("") se tratan como ausentes.
  const limpio = Object.fromEntries(Object.entries(fuente).filter(([, valor]) => valor !== ""));
  const resultado = esquemaEnv.safeParse(limpio);
  if (!resultado.success) {
    const detalle = resultado.error.issues.map(issue => `  - ${issue.path.join(".")}: ${issue.message}`).join("\n");
    throw new Error(`Configuración inválida en .env:\n${detalle}`);
  }
  const env = resultado.data;
  if (/\[(?:YOUR-)?PASSWORD\]|\[(?:YOUR-)?REF\]|\[REGION\]/i.test(env.DATABASE_URL)) {
    throw new Error("Reemplace los marcadores [REF], [REGION] y [PASSWORD] en DATABASE_URL por valores reales");
  }
  if (env.DIRECT_URL && /\[(?:YOUR-)?PASSWORD\]|\[(?:YOUR-)?REF\]|\[REGION\]/i.test(env.DIRECT_URL)) {
    throw new Error("Reemplace los marcadores [REF], [REGION] y [PASSWORD] en DIRECT_URL por valores reales");
  }
  if (Boolean(env.SUPABASE_URL) !== Boolean(env.SUPABASE_ANON_KEY)) {
    throw new Error("SUPABASE_URL y SUPABASE_ANON_KEY deben configurarse juntas");
  }
  if (env.TELEGRAM_BOT_TOKEN && !env.TELEGRAM_WEBHOOK_SECRET && env.PUBLIC_URL) {
    throw new Error("Con PUBLIC_URL (webhook) también se requiere TELEGRAM_WEBHOOK_SECRET");
  }
  if (env.NODE_ENV === "production" && env.CORS_ORIGINS.length === 0) {
    throw new Error("En producción configure CORS_ORIGINS con los dominios de los frontends");
  }
  if (env.NODE_ENV === "production" && env.CORS_ORIGINS.some(origen => new URL(origen).protocol !== "https:")) {
    throw new Error("En producción CORS_ORIGINS solo puede contener orígenes HTTPS");
  }
  if (env.NODE_ENV === "production" && !env.DIRECT_URL) {
    throw new Error("En producción configure DIRECT_URL para ejecutar las migraciones de Prisma");
  }
  return env;
}

export const env = leerEnv();
