import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { PublicacionService } from "../../src/modules/publicacion/publicacion.service.js";
import { NoEncontradoError } from "../../src/shared/domain/errores.js";
import { colaborador, directora, comunicaciones, PublicacionRepositoryEnMemoria } from "../apoyo/fakes.js";

describe("PublicacionService", () => {
  let repo: PublicacionRepositoryEnMemoria;
  let service: PublicacionService;

  beforeEach(() => {
    repo = new PublicacionRepositoryEnMemoria();
    service = new PublicacionService(repo);
  });

  test("crear guarda un borrador y devuelve el DTO interno", async () => {
    const dto = await service.crear({ titulo: "Noticia", cuerpo: "Texto", estado: "BORRADOR" }, colaborador);
    assert.equal(dto.estado, "BORRADOR");
    assert.equal(repo.datos.size, 1);
  });

  test("crear con imagen la guarda asociada al borrador", async () => {
    const url = "https://res.cloudinary.com/upnews/image/upload/v1/noticia.jpg";
    const dto = await service.crear(
      { titulo: "Noticia con imagen", cuerpo: "Texto", estado: "BORRADOR" },
      colaborador,
      url,
    );
    assert.equal(repo.imagenes.get(dto.id), url);
    assert.equal(dto.imagenUrl, url);
    assert.equal(dto.tipoEvidencia, "IMAGEN");
    assert.equal(repo.datos.get(dto.id)?.autorId, colaborador.id);
  });

  test("crear con enlace de YouTube guarda la evidencia como video", async () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const dto = await service.crear(
      { titulo: "Noticia con video", cuerpo: "Texto", estado: "BORRADOR" },
      colaborador,
      url,
    );

    assert.equal(dto.imagenUrl, url);
    assert.equal(dto.tipoEvidencia, "VIDEO");
    assert.equal(repo.datos.get(dto.id)?.aProps().tipoEvidencia, "VIDEO");
  });

  test("editar reemplaza una imagen por una evidencia de tipo video", async () => {
    const imagen = "https://res.cloudinary.com/upnews/image/upload/v1/noticia.jpg";
    const video = "https://youtu.be/dQw4w9WgXcQ";
    const creada = await service.crear(
      { titulo: "Noticia", cuerpo: "Texto", estado: "BORRADOR" },
      colaborador,
      imagen,
    );

    const actualizada = await service.editar(creada.id, {}, colaborador, video);

    assert.equal(actualizada.imagenUrl, video);
    assert.equal(actualizada.tipoEvidencia, "VIDEO");
    assert.equal(repo.datos.get(creada.id)?.aProps().tipoEvidencia, "VIDEO");
  });

  test("la web solo ve publicaciones publicadas", async () => {
    const borrador = await service.crear({ titulo: "Borrador", cuerpo: "T", estado: "BORRADOR" }, colaborador);
    const otra = await service.crear({ titulo: "Publicada", cuerpo: "T", estado: "BORRADOR" }, comunicaciones);
    await service.publicar(otra.id, directora);
    await service.cambiarActivacion(otra.id, true, directora);

    const pagina = await service.listarPublicadas({ pagina: 1, limite: 10 });
    assert.deepEqual(pagina.items.map(p => p.titulo), ["Publicada"]);
    assert.equal("estado" in pagina.items[0]!, false, "la respuesta pública no expone el estado");
    await assert.rejects(service.obtenerPublicada(borrador.id), NoEncontradoError);
  });

  test("la gestión muestra a cada colaborador todas sus noticias (no las ajenas) y todo a la directora", async () => {
    await service.crear(
      { titulo: "Mi borrador", cuerpo: "Texto", estado: "BORRADOR" },
      colaborador,
    );
    const pendiente = await service.crear(
      { titulo: "En revisión", cuerpo: "Texto", estado: "PENDIENTE_APROBACION" },
      colaborador,
    );
    await service.crear(
      { titulo: "Otro borrador", cuerpo: "Texto", estado: "BORRADOR" },
      comunicaciones,
    );

    const visiblesAlAutor = await service.listarGestion(colaborador);
    assert.deepEqual(visiblesAlAutor.map(item => item.titulo).sort(), ["En revisión", "Mi borrador"]);
    assert.equal((await service.listarGestion(directora)).length, 3);
    assert.equal((await service.obtenerGestion(pendiente.id, colaborador)).estado, "PENDIENTE_APROBACION");
    await assert.rejects(service.obtenerGestion(pendiente.id, comunicaciones), NoEncontradoError);
  });

  test("filtra por etiqueta sin importar mayúsculas y lista etiquetas solo de lo publicado", async () => {
    const taller = await service.crear({ titulo: "Taller", cuerpo: "T", etiqueta: "Talleres", estado: "BORRADOR" }, comunicaciones);
    await service.crear({ titulo: "Oculta", cuerpo: "T", etiqueta: "Eventos", estado: "BORRADOR" }, comunicaciones);
    await service.publicar(taller.id, directora);
    await service.cambiarActivacion(taller.id, true, directora);

    const filtradas = await service.listarPublicadas({ pagina: 1, limite: 10, etiqueta: "talleres" });
    assert.deepEqual(filtradas.items.map(p => p.titulo), ["Taller"]);
    assert.deepEqual(await service.listarEtiquetas(), ["Talleres"]);
  });

  test("la directora puede aprobar y activar en una sola operación", async () => {
    const borrador = await service.crear(
      { titulo: "Noticia para publicar", cuerpo: "Texto", estado: "PENDIENTE_APROBACION" },
      colaborador,
    );

    const publicada = await service.aprobarYActivar(borrador.id, directora);

    assert.equal(publicada.estado, "PUBLICADA");
    assert.equal(publicada.estaActivo, true);
    assert.equal((await service.listarPublicadas({ pagina: 1, limite: 10 })).total, 1);
  });

  test("editar con otra imagen reemplaza la anterior y la web pública la recibe", async () => {
    const primera = "https://res.cloudinary.com/upnews/image/upload/v1/a.jpg";
    const segunda = "https://res.cloudinary.com/upnews/image/upload/v1/b.jpg";
    const creada = await service.crear({ titulo: "Con foto", cuerpo: "Texto", estado: "BORRADOR" }, colaborador, primera);

    await service.editar(creada.id, { titulo: "Con foto nueva" }, colaborador, segunda);
    await service.aprobarYActivar(creada.id, directora);

    assert.equal(repo.imagenes.get(creada.id), segunda);
    assert.equal((await service.obtenerPublicada(creada.id)).imagenUrl, segunda);
  });

  test("editar sin imagen conserva la imagen actual", async () => {
    const url = "https://res.cloudinary.com/upnews/image/upload/v1/a.jpg";
    const creada = await service.crear({ titulo: "Con foto", cuerpo: "Texto", estado: "BORRADOR" }, colaborador, url);
    await service.editar(creada.id, { cuerpo: "Texto corregido" }, colaborador);
    assert.equal(repo.imagenes.get(creada.id), url);
  });

  test("el autor envía su borrador a aprobación", async () => {
    const creada = await service.crear({ titulo: "Para revisar", cuerpo: "Texto", estado: "BORRADOR" }, colaborador);
    const enviada = await service.enviarAAprobacion(creada.id, colaborador);
    assert.equal(enviada.estado, "PENDIENTE_APROBACION");
  });
});
