/**
 * Errores de dominio. Las capas internas (entity, service) lanzan estos errores
 * sin saber nada de HTTP; el middleware de errores los traduce a códigos de estado
 * y el bot de Telegram los traduce a mensajes de chat.
 */
export abstract class ErrorDeDominio extends Error {
  abstract readonly codigo: string;

  constructor(mensaje: string) {
    super(mensaje);
    this.name = new.target.name;
  }
}

/** Los datos de entrada no cumplen el formato esperado (DTO inválido). */
export class ValidacionError extends ErrorDeDominio {
  readonly codigo = "VALIDACION";

  constructor(mensaje: string, readonly campos: string[] = []) {
    super(mensaje);
  }
}

/** El recurso pedido no existe (o no es visible para quien lo pide). */
export class NoEncontradoError extends ErrorDeDominio {
  readonly codigo = "NO_ENCONTRADO";
}

/** Quien hace la acción no tiene permiso para hacerla. */
export class NoAutorizadoError extends ErrorDeDominio {
  readonly codigo = "NO_AUTORIZADO";
}

/** No se recibió una sesión válida o el servicio de identidad la rechazó. */
export class NoAutenticadoError extends ErrorDeDominio {
  readonly codigo = "NO_AUTORIZADO";
}

/** El servicio externo de identidad no pudo validar la sesión. */
export class ServicioAutenticacionExternaError extends ErrorDeDominio {
  readonly codigo = "ERROR_AUTENTICACION_EXTERNA";
}

/** Una funcionalidad depende de una integración que no está configurada. */
export class ServicioNoDisponibleError extends ErrorDeDominio {
  readonly codigo = "SERVICIO_NO_DISPONIBLE";
}

/** initData inválido, manipulado o expirado. */
export class TelegramInitDataInvalidoError extends NoAutorizadoError {
  constructor() {
    super("La sesión de Telegram es inválida o ha expirado");
  }
}

/** La acción es válida en formato, pero viola una regla del negocio (ej: editar una noticia archivada). */
export class ReglaDeNegocioError extends ErrorDeDominio {
  readonly codigo = "REGLA_DE_NEGOCIO";
}
