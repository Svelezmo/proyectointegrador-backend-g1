import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { InformacionContacto } from "../../src/modules/contacto/informacion-contacto.entity.js";
import type { InformacionContactoRepository } from "../../src/modules/contacto/informacion-contacto.repository.js";
import { InformacionContactoService } from "../../src/modules/contacto/informacion-contacto.service.js";
import { NoAutorizadoError } from "../../src/shared/domain/errores.js";
import { colaborador, directora } from "../apoyo/fakes.js";

class ContactosEnMemoria implements InformacionContactoRepository {
  readonly datos = new Map<string, InformacionContacto>();
  async listar() { return [...this.datos.values()]; }
  async buscarPorId(id: string) { return this.datos.get(id) ?? null; }
  async guardar(contacto: InformacionContacto) { this.datos.set(contacto.aProps().id, contacto); }
  async eliminar(id: string) { this.datos.delete(id); }
}

describe("InformacionContactoService", () => {
  test("la web recibe el contacto sin datos internos y sin necesidad de sesión", async () => {
    const service = new InformacionContactoService(new ContactosEnMemoria());
    await service.guardar({ nombre: "WhatsApp", tipo: "NUMERO_CONTACTO", informacion: "+57 300 000 0000" }, directora);

    assert.deepEqual(await service.listarPublico(), [
      { nombre: "WhatsApp", tipo: "NUMERO_CONTACTO", informacion: "+57 300 000 0000" },
    ]);
  });

  test("solo la directora puede administrar el contacto", async () => {
    const service = new InformacionContactoService(new ContactosEnMemoria());
    await assert.rejects(
      service.guardar({ nombre: "Sede", tipo: "DIRECCION", informacion: "Calle 1" }, colaborador),
      NoAutorizadoError,
    );
  });
});
