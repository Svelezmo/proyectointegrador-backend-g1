import { Router } from "express";
import type { GestionController } from "../modules/gestion/gestion.controller.js";

export function crearRutasGestion(controller: GestionController): Router {
  const router = Router();

  /**
   * @openapi
   * /api/gestion/upload-signature:
   *   post:
   *     tags: [Gestión]
   *     summary: Obtiene parámetros para subir una imagen a Cloudinary
   *     description: La web se autentica con Bearer y la Mini App con X-Telegram-Init-Data. El navegador usa los parámetros devueltos para subir directamente a Cloudinary; el secreto de Cloudinary nunca se expone.
   *     parameters:
   *       - in: header
   *         name: Authorization
   *         required: false
   *         description: Para clientes web. La Mini App usa X-Telegram-Init-Data.
   *         schema: { type: string, example: "Bearer <token>" }
   *     responses:
   *       200: { description: Parámetros firmados de subida }
   *       401: { $ref: '#/components/responses/NoAutenticado' }
   *       403: { $ref: '#/components/responses/NoAutorizado' }
   *       503: { description: Cloudinary no está configurado }
   */
  router.post("/upload-signature", controller.crearFirmaSubidaImagen);

  /**
   * @openapi
   * /api/gestion/publicaciones:
   *   get:
   *     tags: [Gestión]
   *     summary: Lista las noticias gestionables por el usuario
   *     parameters:
   *       - in: header
   *         name: Authorization
   *         required: false
   *         description: Para clientes web. La Mini App usa X-Telegram-Init-Data.
   *         schema: { type: string, example: "Bearer <token>" }
   *     responses:
   *       200: { description: Noticias propias (o todas, si es DIRECTORA) }
   *       403: { $ref: '#/components/responses/NoAutorizado' }
   *   post:
   *     tags: [Gestión]
   *     summary: Crea una noticia desde un cliente web
   *     description: La identidad se valida en cada petición. estado solo acepta BORRADOR o PENDIENTE_APROBACION; aprobar y activar son acciones exclusivas de DIRECTORA.
   *     parameters:
   *       - in: header
   *         name: Authorization
   *         required: false
   *         description: Para clientes web. La Mini App usa X-Telegram-Init-Data.
   *         schema: { type: string, example: "Bearer <token>" }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [titulo, cuerpo]
   *             properties:
   *               titulo: { type: string, maxLength: 150 }
   *               cuerpo: { type: string, maxLength: 10000 }
   *               estado: { type: string, enum: [BORRADOR, PENDIENTE_APROBACION] }
   *               imagenUrl: { type: string, format: uri }
   *     responses:
   *       201: { description: Noticia creada }
   *       400: { $ref: '#/components/responses/DatosInvalidos' }
   *       403: { $ref: '#/components/responses/NoAutorizado' }
   */
  router.get("/publicaciones", controller.listarPublicaciones);
  router.post("/publicaciones", controller.crearPublicacion);
  /**
   * @openapi
   * /api/gestion/publicaciones/{id}:
   *   get:
   *     tags: [Gestión]
   *     summary: Consulta una noticia gestionable
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *       - in: header
   *         name: Authorization
   *         required: false
   *         description: Para clientes web. La Mini App usa X-Telegram-Init-Data.
   *         schema: { type: string, example: "Bearer <token>" }
   *     responses:
   *       200: { description: Noticia y estado interno }
   *       404: { $ref: '#/components/responses/NoEncontrado' }
   *   patch:
   *     tags: [Gestión]
   *     summary: Modifica una noticia
   *     description: COLABORADOR solo modifica sus borradores; DIRECTORA puede modificar noticias no archivadas.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *       - in: header
   *         name: Authorization
   *         required: false
   *         description: Para clientes web. La Mini App usa X-Telegram-Init-Data.
   *         schema: { type: string, example: "Bearer <token>" }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               titulo: { type: string }
   *               resumen: { type: string }
   *               cuerpo: { type: string }
   *               proposito: { type: string }
   *               etiqueta: { type: string }
   *     responses:
   *       200: { description: Noticia actualizada }
   *       403: { $ref: '#/components/responses/NoAutorizado' }
   *   delete:
   *     tags: [Gestión]
   *     summary: Elimina una noticia gestionable
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *       - in: header
   *         name: Authorization
   *         required: false
   *         description: Para clientes web. La Mini App usa X-Telegram-Init-Data.
   *         schema: { type: string, example: "Bearer <token>" }
   *     responses:
   *       204: { description: Noticia eliminada }
   */
  router.get("/publicaciones/:id", controller.obtenerPublicacion);
  router.patch("/publicaciones/:id", controller.editarPublicacion);
  router.delete("/publicaciones/:id", controller.eliminarPublicacion);
  /**
   * @openapi
   * /api/gestion/publicaciones/{id}/enviar:
   *   post:
   *     tags: [Gestión]
   *     summary: Envía un borrador propio a aprobación (pasa a PENDIENTE_APROBACION)
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *       - in: header
   *         name: Authorization
   *         required: false
   *         description: Para clientes web. La Mini App usa X-Telegram-Init-Data.
   *         schema: { type: string, example: "Bearer <token>" }
   *     responses:
   *       200: { description: Noticia enviada a aprobación }
   *       403: { $ref: '#/components/responses/NoAutorizado' }
   *       409: { description: Solo un borrador puede enviarse a aprobación }
   */
  router.post("/publicaciones/:id/enviar", controller.enviarAAprobacion);
  /**
   * @openapi
   * /api/gestion/publicaciones/{id}/aprobar:
   *   post:
   *     tags: [Gestión]
   *     summary: Aprueba una noticia (solo DIRECTORA)
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *       - in: header
   *         name: Authorization
   *         required: false
   *         description: Para clientes web. La Mini App usa X-Telegram-Init-Data.
   *         schema: { type: string, example: "Bearer <token>" }
   *     responses:
   *       200: { description: Noticia aprobada, todavía inactiva }
   *       403: { $ref: '#/components/responses/NoAutorizado' }
   */
  router.post("/publicaciones/:id/aprobar", controller.aprobarPublicacion);
  /**
   * @openapi
   * /api/gestion/publicaciones/{id}/aprobar-y-activar:
   *   post:
   *     tags: [Gestión]
   *     summary: Aprueba y activa una noticia en una sola acción (solo DIRECTORA)
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *       - in: header
   *         name: Authorization
   *         required: false
   *         description: Para clientes web. La Mini App usa X-Telegram-Init-Data.
   *         schema: { type: string, example: "Bearer <token>" }
   *     responses:
   *       200: { description: Noticia aprobada y activa }
   *       403: { $ref: '#/components/responses/NoAutorizado' }
   */
  router.post("/publicaciones/:id/aprobar-y-activar", controller.aprobarYActivarPublicacion);
  /**
   * @openapi
   * /api/gestion/publicaciones/{id}/activacion:
   *   patch:
   *     tags: [Gestión]
   *     summary: Activa o desactiva una noticia aprobada (solo DIRECTORA)
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *       - in: header
   *         name: Authorization
   *         required: false
   *         description: Para clientes web. La Mini App usa X-Telegram-Init-Data.
   *         schema: { type: string, example: "Bearer <token>" }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [estaActivo]
   *             properties:
   *               estaActivo: { type: boolean }
   *     responses:
   *       200: { description: Activación actualizada }
   *       403: { $ref: '#/components/responses/NoAutorizado' }
   */
  router.patch("/publicaciones/:id/activacion", controller.activarPublicacion);

  /**
   * @openapi
   * /api/gestion/usuarios:
   *   parameters:
   *     - in: header
   *       name: Authorization
   *       required: false
   *       description: Para clientes web. La Mini App usa X-Telegram-Init-Data.
   *       schema: { type: string, example: "Bearer <token>" }
   *   get:
   *     tags: [Gestión]
   *     summary: Lista colaboradores (solo DIRECTORA)
   *   post:
   *     tags: [Gestión]
   *     summary: Registra un colaborador (solo DIRECTORA)
   *     description: Requiere nombre e ID de Telegram. El rol se asigna siempre como COLABORADOR.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [nombre, telegramId]
   *             properties:
   *               nombre: { type: string }
   *               telegramId: { type: string }
   *     responses:
   *       201: { description: Colaborador registrado }
   *       403: { $ref: '#/components/responses/NoAutorizado' }
   */
  router.get("/usuarios", controller.listarUsuarios);
  router.post("/usuarios", controller.crearUsuario);
  /**
   * @openapi
   * /api/gestion/usuarios/{id}:
   *   parameters:
   *     - in: path
   *       name: id
   *       required: true
   *       schema: { type: string, format: uuid }
   *     - in: header
   *       name: Authorization
   *       required: false
   *       description: Para clientes web. La Mini App usa X-Telegram-Init-Data.
   *       schema: { type: string, example: "Bearer <token>" }
   *   patch:
   *     tags: [Gestión]
   *     summary: Modifica nombre o acceso de un colaborador
   *     responses:
   *       200: { description: Colaborador actualizado }
   *       403: { $ref: '#/components/responses/NoAutorizado' }
   *   delete:
   *     tags: [Gestión]
   *     summary: Desactiva un colaborador sin borrar su historial
   *     responses:
   *       200: { description: Colaborador desactivado }
   *       403: { $ref: '#/components/responses/NoAutorizado' }
   */
  router.patch("/usuarios/:id", controller.editarUsuario);
  router.delete("/usuarios/:id", controller.eliminarUsuario);

  /**
   * @openapi
   * /api/gestion/contactos:
   *   parameters:
   *     - in: header
   *       name: Authorization
   *       required: false
   *       description: Para clientes web. La Mini App usa X-Telegram-Init-Data.
   *       schema: { type: string, example: "Bearer <token>" }
   *   get:
   *     tags: [Gestión]
   *     summary: Lista la información de contacto (solo DIRECTORA)
   *   post:
   *     tags: [Gestión]
   *     summary: Crea un dato de contacto (solo DIRECTORA)
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [nombre, tipo, informacion]
   *             properties:
   *               nombre: { type: string }
   *               tipo: { type: string, enum: [RED_SOCIAL, NUMERO_CONTACTO, DIRECCION] }
   *               informacion: { type: string }
   *     responses:
   *       201: { description: Información creada }
   */
  router.get("/contactos", controller.listarContactos);
  router.post("/contactos", controller.guardarContacto);
  /**
   * @openapi
   * /api/gestion/contactos/{id}:
   *   parameters:
   *     - in: path
   *       name: id
   *       required: true
   *       schema: { type: string, format: uuid }
   *     - in: header
   *       name: Authorization
   *       required: false
   *       description: Para clientes web. La Mini App usa X-Telegram-Init-Data.
   *       schema: { type: string, example: "Bearer <token>" }
   *   patch:
   *     tags: [Gestión]
   *     summary: Modifica un dato de contacto
   *     responses:
   *       200: { description: Información actualizada }
   *       403: { $ref: '#/components/responses/NoAutorizado' }
   *   delete:
   *     tags: [Gestión]
   *     summary: Elimina un dato de contacto
   *     responses:
   *       204: { description: Información eliminada }
   *       403: { $ref: '#/components/responses/NoAutorizado' }
   */
  router.patch("/contactos/:id", controller.guardarContacto);
  router.delete("/contactos/:id", controller.eliminarContacto);

  return router;
}
