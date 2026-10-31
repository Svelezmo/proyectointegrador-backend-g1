export interface Paginacion {
  readonly pagina: number;
  readonly limite: number;
}

export interface Pagina<T> {
  readonly items: T[];
  readonly total: number;
  readonly pagina: number;
  readonly limite: number;
}
