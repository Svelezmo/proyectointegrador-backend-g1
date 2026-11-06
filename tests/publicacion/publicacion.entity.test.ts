import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { Publicacion } from "../../src/modules/publicacion/publicacion.entity.js";
import { crearPublicacionDto, editarPublicacionDto } from "../../src/modules/publicacion/publicacion.dto.js";
import { NoAutorizadoError, ReglaDeNegocioError, ValidacionError } from "../../src/shared/domain/errores.js";
import { colaborador, comunicaciones, directora } from "../apoyo/fakes.js";

const nueva = (titulo = "Jornada de salud", cuerpo = "Este sábado...") =>
  Publicacion.crear({ titulo, cuerpo }, colaborador);

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

  test("solo la directora puede activar una noticia aprobada", () => {
    const p = nueva();
    assert.throws(() => p.cambiarActivacion(true, colaborador), NoAutorizadoError);
    assert.throws(() => p.cambiarActivacion(true, directora), ReglaDeNegocioError);
  });

  test("un autor solo puede editar su propio borrador", () => {
    const p = nueva();
    p.editar({ titulo: "Borrador editado" }, colaborador);
    assert.equal(p.titulo, "Borrador editado");
    p.enviarAAprobacion(colaborador);
    assert.throws(() => p.editar({ titulo: "Cambio tardío" }, colaborador), NoAutorizadoError);
  });

  test("flujo colaborador -> aprobación de directora y activación", () => {
    const p = nueva();
    p.enviarAAprobacion(colaborador);
    assert.equal(p.estado, "PENDIENTE_APROBACION");
    assert.throws(() => p.publicar(comunicaciones), NoAutorizadoError);
    p.publicar(directora);
    assert.equal(p.estado, "PUBLICADA");
    assert.equal(p.aProps().aprobadoPor, directora.id);
    assert.equal(p.estaPublicada, false);
    p.cambiarActivacion(true, directora);
    assert.equal(p.estaPublicada, true);
    assert.ok(p.aProps().publicadaEn instanceof Date);
  });

  test("un colaborador no puede editar una publicación archivada", () => {
    const p = nueva();
    p.archivar(directora);
    assert.throws(() => p.editar({ titulo: "Otro" }, colaborador), NoAutorizadoError);
  });

  test("la directora puede corregir una publicación archivada", () => {
    const p = nueva();
    p.archivar(directora);
    p.editar({ titulo: "Noticia archivada corregida" }, directora);
    assert.equal(p.titulo, "Noticia archivada corregida");
  });

  test("una edición inválida no deja la entidad a medias", () => {
    const p = nueva();
    assert.throws(() => p.editar({ titulo: "" }, colaborador), ValidacionError);
    assert.equal(p.titulo, "Jornada de salud");
  });

  test("rechaza los campos de origen que ya no forman parte de una publicación", () => {
    const crearConOrigen = crearPublicacionDto.safeParse({
      titulo: "Noticia",
      cuerpo: "Texto",
      moduloOrigen: null,
      registroOrigenId: null,
    });
    const editarConOrigen = editarPublicacionDto.safeParse({ moduloOrigen: "eventos" });
    assert.equal(crearConOrigen.success, false);
    assert.equal(editarConOrigen.success, false);
  });

  test("rechaza el canal eliminado del contrato de publicación", () => {
    const conCanal = crearPublicacionDto.safeParse({
      titulo: "Noticia",
      cuerpo: "Texto",
      canal: "web",
    });
    assert.equal(conCanal.success, false);
  });
});
