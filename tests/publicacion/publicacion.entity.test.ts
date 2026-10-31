import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { Publicacion } from "../../src/modules/publicacion/publicacion.entity.js";
import { NoAutorizadoError, ReglaDeNegocioError, ValidacionError } from "../../src/shared/domain/errores.js";
import { CANAL_WEB_ID, colaborador, comunicaciones, directora } from "../apoyo/fakes.js";

const nueva = (titulo = "Jornada de salud", cuerpo = "Este sábado...") =>
  Publicacion.crear({ titulo, cuerpo, canalId: CANAL_WEB_ID }, colaborador);

describe("Publicacion (entity)", () => {
  test("una publicación nueva empieza como borrador del autor", () => {
    const p = nueva();
    assert.equal(p.estado, "BORRADOR");
    assert.equal(p.autorId, colaborador.id);
  });

  test("rechaza título o cuerpo vacíos", () => {
    assert.throws(() => nueva("   "), ValidacionError);
    assert.throws(() => nueva("Título", ""), ValidacionError);
  });

  test("un colaborador no puede publicar directamente", () => {
    assert.throws(() => nueva().publicar(colaborador), NoAutorizadoError);
  });

  test("flujo colaborador -> aprobación -> comunicaciones publica", () => {
    const p = nueva();
    p.enviarAAprobacion(colaborador);
    assert.equal(p.estado, "PENDIENTE_APROBACION");
    p.publicar(comunicaciones);
    assert.equal(p.estado, "PUBLICADA");
    assert.equal(p.aProps().aprobadoPor, comunicaciones.id);
    assert.ok(p.aProps().publicadaEn instanceof Date);
  });

  test("no se puede editar una publicación archivada", () => {
    const p = nueva();
    p.archivar(directora);
    assert.throws(() => p.editar({ titulo: "Otro" }, directora), ReglaDeNegocioError);
  });

  test("una edición inválida no deja la entidad a medias", () => {
    const p = nueva();
    assert.throws(() => p.editar({ titulo: "" }, colaborador), ValidacionError);
    assert.equal(p.titulo, "Jornada de salud");
  });
});
