import type { Request, Response } from "express";
import { z } from "zod";
import type { Actor } from "../../shared/domain/actor.js";
import { NoAutorizadoError, ValidacionError } from "../../shared/domain/errores.js";
import { validar } from "../../shared/validacion.js";
import type { TelegramMiniAppAuthPort } from "../telegram/telegram-miniapp-auth.port.js";
import type { AlmacenamientoPort } from "../almacenamiento/almacenamiento.port.js";
import { informacionContactoDto, idContactoDto } from "../contacto/informacion-contacto.dto.js";
import type { InformacionContactoService } from "../contacto/informacion-contacto.service.js";
import { crearPublicacionDto, editarPublicacionDto, idPublicacionDto } from "../publicacion/publicacion.dto.js";
import type { PublicacionService } from "../publicacion/publicacion.service.js";
import { autorizarUsuarioDto, editarUsuarioDto, idUsuarioDto } from "../usuario-autorizado/usuario-autorizado.dto.js";
import type { UsuarioAutorizadoService } from "../usuario-autorizado/usuario-autorizado.service.js";

const crearGestionPublicacionDto = crearPublicacionDto.extend({
  imagenUrl: z.url({ protocol: /^https$/ }).optional(),
});
const editarGestionPublicacionDto = editarPublicacionDto.extend({
  imagenUrl: z.url({ protocol: /^https$/ }).optional(),
});
const activacionDto = z.object({ estaActivo: z.boolean() }).strict();

export class GestionController {
  constructor(
    private readonly autenticacion: TelegramMiniAppAuthPort,
    private readonly publicaciones: PublicacionService,
    private readonly usuarios: UsuarioAutorizadoService,
    private readonly contactos: InformacionContactoService,
    private readonly almacenamiento?: AlmacenamientoPort,
  ) {}

  listarPublicaciones = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.publicaciones.listarGestion(await this.obtenerActor(req)));
  };

  obtenerPublicacion = async (req: Request, res: Response): Promise<void> => {
    const { id } = validar(idPublicacionDto, req.params);
    res.json(await this.publicaciones.obtenerGestion(id, await this.obtenerActor(req)));
  };

  crearPublicacion = async (req: Request, res: Response): Promise<void> => {
    const datos = validar(crearGestionPublicacionDto, req.body);
    const actor = await this.obtenerActor(req);
    const { imagenUrl, ...noticia } = datos;
    this.validarImagen(imagenUrl);
    res.status(201).json(await this.publicaciones.crear(noticia, actor, imagenUrl));
  };

  editarPublicacion = async (req: Request, res: Response): Promise<void> => {
    const { id } = validar(idPublicacionDto, req.params);
    const datos = validar(editarGestionPublicacionDto, req.body);
    const actor = await this.obtenerActor(req);
    const { imagenUrl, ...noticia } = datos;
    this.validarImagen(imagenUrl);
    res.json(await this.publicaciones.editar(id, noticia, actor, imagenUrl));
  };

  aprobarPublicacion = async (req: Request, res: Response): Promise<void> => {
    const { id } = validar(idPublicacionDto, req.params);
    res.json(await this.publicaciones.publicar(id, await this.obtenerActor(req)));
  };

  aprobarYActivarPublicacion = async (req: Request, res: Response): Promise<void> => {
    const { id } = validar(idPublicacionDto, req.params);
    res.json(await this.publicaciones.aprobarYActivar(id, await this.obtenerActor(req)));
  };

  activarPublicacion = async (req: Request, res: Response): Promise<void> => {
    const { id } = validar(idPublicacionDto, req.params);
    const { estaActivo } = validar(activacionDto, req.body);
    res.json(await this.publicaciones.cambiarActivacion(id, estaActivo, await this.obtenerActor(req)));
  };

  eliminarPublicacion = async (req: Request, res: Response): Promise<void> => {
    const { id } = validar(idPublicacionDto, req.params);
    await this.publicaciones.eliminar(id, await this.obtenerActor(req));
    res.status(204).end();
  };

  listarUsuarios = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.usuarios.listar(await this.obtenerActor(req)));
  };

  crearUsuario = async (req: Request, res: Response): Promise<void> => {
    const datos = validar(autorizarUsuarioDto.pick({ telegramId: true, nombre: true }), req.body);
    res.status(201).json(await this.usuarios.registrarColaborador(datos, await this.obtenerActor(req)));
  };

  editarUsuario = async (req: Request, res: Response): Promise<void> => {
    const { id } = validar(idUsuarioDto, req.params);
    const datos = validar(editarUsuarioDto, req.body);
    res.json(await this.usuarios.actualizar(id, datos, await this.obtenerActor(req)));
  };

  eliminarUsuario = async (req: Request, res: Response): Promise<void> => {
    const { id } = validar(idUsuarioDto, req.params);
    const usuario = await this.usuarios.actualizar(id, { activo: false }, await this.obtenerActor(req));
    res.json(usuario);
  };

  listarContactos = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.contactos.listar(await this.obtenerActor(req)));
  };

  guardarContacto = async (req: Request, res: Response): Promise<void> => {
    const datos = validar(informacionContactoDto, req.body);
    const id = req.params.id === undefined ? undefined : validar(idContactoDto, req.params).id;
    res.status(id ? 200 : 201).json(await this.contactos.guardar(datos, await this.obtenerActor(req), id));
  };

  eliminarContacto = async (req: Request, res: Response): Promise<void> => {
    const { id } = validar(idContactoDto, req.params);
    await this.contactos.eliminar(id, await this.obtenerActor(req));
    res.status(204).end();
  };

  private async obtenerActor(req: Request): Promise<Actor> {
    const initData = req.get("X-Telegram-Init-Data");
    if (!initData) throw new NoAutorizadoError("Falta la sesión autenticada");
    return this.autenticacion.autenticar(initData);
  }

  private validarImagen(imagenUrl: string | undefined): void {
    if (
      imagenUrl &&
      (!this.almacenamiento ||
        !this.almacenamiento.perteneceAEsteAlmacenamiento(imagenUrl))
    ) {
      throw new ValidacionError(
        "La imagen no pertenece al almacenamiento configurado",
        ["imagenUrl"],
      );
    }
  }
}
