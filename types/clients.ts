export interface Empresa {
  idempresa: number;
  nombre: string;
  direccion: string | null;
  nit: string | null;
  telefono: string | null;
  correo: string | null;
  estado: boolean;
  // Cantidad de contactos activos ligados a esta empresa
  // (se calcula aparte, no viene de una columna real).
  totalContactos?: number;
}

export interface Contacto {
  idcontacto: number;
  idempresa: number | null;
  cargo: string | null;
  nombre: string;
  apellido: string;
  dpi: string | null;
  correo: string | null;
  telefono: string | null;
  estado: boolean;
  empresa?: { nombre: string } | null;
}