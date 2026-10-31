import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { PublicacionService } from "../../src/modules/publicacion/publicacion.service.js";
import { NoEncontradoError, ValidacionError } from "../../src/shared/domain/errores.js";
import { CanalRepositoryEnMemoria, colaborador, comunicaciones, PublicacionRepositoryEnMemoria } from "../apoyo/fakes.js";

describe("PublicacionService", () => {
  let repo: PublicacionRepositoryEnMemoria;
  let service: PublicacionService;

  beforeEach(() => {
    repo = new PublicacionRepositoryEnMemoria();
    service = new PublicacionService(repo, new CanalRepositoryEnMemoria());
  });

  test("crear guarda un borrador y devuelve el DTO interno", async () => {
    const dto = await service.crear({ titulo: "Noticia", cuerpo: "Texto", canal: "web" }, colaborador);
    assert.equal(dto.estado, "BORRADOR");
    assert.equal(repo.datos.size, 1);
  });

  test("crear falla si el canal no existe", async () => {
    await assert.rejects(service.crear({ titulo: "N", cuerpo: "T", canal: "tiktok" }, colaborador), ValidacionError);
  });

  test("la web solo ve publicaciones publicadas", async () => {
    const borrador = await service.crear({ titulo: "Borrador", cuerpo: "T", canal: "web" }, colaborador);
    const otra = await service.crear({ titulo: "Publicada", cuerpo: "T", canal: "web" }, comunicaciones);
    await service.publicar(otra.id, comunicaciones);

    const pagina = await service.listarPublicadas({ pagina: 1, limite: 10 });
    assert.deepEqual(pagina.items.map(p => p.titulo), ["Publicada"]);
    assert.equal("estado" in pagina.items[0]!, false, "la respuesta pública no expone el estado");
    await assert.rejects(service.obtenerPublicada(borrador.id), NoEncontradoError);
  });

  test("filtra por etiqueta sin importar mayúsculas y lista etiquetas solo de lo publicado", async () => {
    const taller = await service.crear({ titulo: "Taller", cuerpo: "T", etiqueta: "Talleres", canal: "web" }, comunicaciones);
    await service.crear({ titulo: "Oculta", cuerpo: "T", etiqueta: "Eventos", canal: "web" }, comunicaciones);
    await service.publicar(taller.id, comunicaciones);

    const filtradas = await service.listarPublicadas({ pagina: 1, limite: 10, etiqueta: "talleres" });
    assert.deepEqual(filtradas.items.map(p => p.titulo), ["Taller"]);
    assert.deepEqual(await service.listarEtiquetas(), ["Talleres"]);
  });
});
