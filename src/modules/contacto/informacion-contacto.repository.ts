import type { InformacionContacto } from "./informacion-contacto.entity.js";

export interface InformacionContactoRepository {
  listar(): Promise<InformacionContacto[]>;
  buscarPorId(id: string): Promise<InformacionContacto | null>;
  guardar(contacto: InformacionContacto): Promise<void>;
  eliminar(id: string): Promise<void>;
}
