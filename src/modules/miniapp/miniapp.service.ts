import type { Actor } from "../../shared/domain/actor.js";
import { ValidacionError } from "../../shared/domain/errores.js";
import type { AlmacenamientoPort, FirmaSubidaImagen } from "../almacenamiento/almacenamiento.port.js";
import type { CrearPublicacionDto, PublicacionInternaDto } from "../publicacion/publicacion.dto.js";
import type { PublicacionService } from "../publicacion/publicacion.service.js";
import type { TelegramMiniAppAuthPort } from "../telegram/telegram-miniapp-auth.port.js";
import type { CrearPublicacionMiniAppDto } from "./miniapp.dto.js";

export class MiniAppService {
  constructor(
    private readonly autenticacion: TelegramMiniAppAuthPort,
    private readonly almacenamiento: AlmacenamientoPort,
    private readonly publicaciones: PublicacionService,
  ) {}

  async crearFirmaSubida(initData: string): Promise<FirmaSubidaImagen> {
    await this.autenticacion.autenticar(initData);
    return this.almacenamiento.crearFirmaSubidaImagen();
  }

  async crearPublicacion(
    dto: CrearPublicacionMiniAppDto,
    initData: string,
  ): Promise<PublicacionInternaDto> {
    const actor: Actor = await this.autenticacion.autenticar(initData);
    if (
      dto.imagenUrl &&
      !this.almacenamiento.perteneceAEsteAlmacenamiento(dto.imagenUrl)
    ) {
      throw new ValidacionError("La imagen no pertenece al almacenamiento configurado", ["imagenUrl"]);
    }
    const datosPublicacion: CrearPublicacionDto = {
      titulo: dto.titulo,
      cuerpo: dto.cuerpo,
      estado: dto.estado,
      ...(dto.resumen ? { resumen: dto.resumen } : {}),
      ...(dto.proposito ? { proposito: dto.proposito } : {}),
      ...(dto.etiqueta ? { etiqueta: dto.etiqueta } : {}),
    };
    return this.publicaciones.crear(datosPublicacion, actor, dto.imagenUrl);
  }
}
