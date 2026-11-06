export interface FirmaSubidaImagen {
  apiKey: string;
  cloudName: string;
  folder: string;
  publicId: string;
  signature: string;
  timestamp: number;
  overwrite: false;
}

export interface AlmacenamientoPort {
  crearFirmaSubidaImagen(): FirmaSubidaImagen;
  perteneceAEsteAlmacenamiento(urlImagen: string): boolean;
}
