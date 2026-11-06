import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import type { AlmacenamientoPort, FirmaSubidaImagen } from "./almacenamiento.port.js";

export class CloudinaryStorageAdapter implements AlmacenamientoPort {
  constructor(
    private readonly cloudName: string,
    private readonly apiKey: string,
    private readonly apiSecret: string,
    private readonly folder: string,
  ) {}

  crearFirmaSubidaImagen(): FirmaSubidaImagen {
    const timestamp = Math.floor(Date.now() / 1000);
    const parametros = {
      folder: this.folder,
      overwrite: false,
      public_id: randomUUID(),
      timestamp,
    };
    return {
      apiKey: this.apiKey,
      cloudName: this.cloudName,
      folder: parametros.folder,
      publicId: parametros.public_id,
      signature: cloudinary.utils.api_sign_request(parametros, this.apiSecret),
      timestamp,
      overwrite: false,
    };
  }

  perteneceAEsteAlmacenamiento(urlImagen: string): boolean {
    try {
      const url = new URL(urlImagen);
      return (
        url.protocol === "https:" &&
        url.hostname === "res.cloudinary.com" &&
        url.pathname.startsWith(`/${this.cloudName}/image/upload/`)
      );
    } catch {
      return false;
    }
  }
}
