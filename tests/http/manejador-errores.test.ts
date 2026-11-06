import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { describe, test } from "node:test";
import express from "express";
import { manejadorErrores } from "../../src/shared/http/middlewares/manejador-errores.js";

/** Simula el error que lanza Prisma sin necesitar una base de datos. */
function errorPrisma(code: string): Error {
  return Object.assign(new Error("prisma"), { name: "PrismaClientKnownRequestError", code });
}

async function respuestaPara(error: Error): Promise<{ status: number; body: unknown }> {
  const app = express();
  app.get("/", () => { throw error; });
  app.use(manejadorErrores);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const { port } = server.address() as AddressInfo;
    const res = await fetch(`http://127.0.0.1:${port}/`);
    return { status: res.status, body: await res.json() };
  } finally {
    server.close();
  }
}

describe("manejadorErrores", () => {
  test("un registro duplicado (P2002) responde 409 en lugar de 500", async () => {
    const { status, body } = await respuestaPara(errorPrisma("P2002"));
    assert.equal(status, 409);
    assert.deepEqual(body, { error: "Ya existe un registro con esos datos", codigo: "DUPLICADO" });
  });

  test("un registro inexistente (P2025) responde 404", async () => {
    assert.equal((await respuestaPara(errorPrisma("P2025"))).status, 404);
  });
});
