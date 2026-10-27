export interface Categoria {
  idcategoria: number;
  nombre: string;
  estado: boolean;
}

export interface EstadoActivo {
  idestadoactivo: number;
  nombre: string;
  estado: boolean;
}

export interface Activo {
  idactivo: number;
  idcategoria: number;
  idestadoactivo: number;
  nombre: string;
  marca: string | null;
  modelo: string | null;
  descripcion: string | null;
  fechacompra: string | null; // formato ISO (yyyy-mm-dd)
  codigoqr: string | null;
  categoria?: { nombre: string } | null;
  estadoActivo?: { nombre: string } | null;
}

export interface TarifaActivo {
  idtarifaactivo: number;
  idcategoria: number;
  preciosemana: number;
  preciomes: number;
  preciodiaunico: number;
  preciodiaextra: number;
  fechainicio: string;
  fechafin: string | null;
  estado: boolean;
  categoria?: { nombre: string } | null;
}

export interface Empresa {
  idempresa: number;
  nombre: string;
  direccion: string | null;
  nit: string | null;
  telefono: string | null;
  correo: string | null;
  estado: boolean;
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
  // Dato "embebido" que trae Supabase al pedir la relación
  // (ver el .select() en useContactos.ts)
  empresa?: { nombre: string } | null;
}

export interface Empleado {
  idempleado: number;
  nombre: string;
  apellido: string;
  telefono: string | null;
  correo: string | null;
  dpi: string | null;
  estado: boolean;
}
 
export interface Rol {
  idrol: number;
  nombre: string;
  estado: boolean;
}
 
export interface Usuario {
  idusuario: number;
  idempleado: number;
  idrol: number;
  usuario: string;
  estado: boolean;
  // Datos "embebidos" que trae Supabase al pedir la relación
  empleado?: { nombre: string; apellido: string; correo: string | null } | null;
  rol?: { nombre: string } | null;
}

export interface Mantenimiento {
  idmantenimiento: number;
  idactivo: number;
  fecha: string;
  descripcion: string | null;
  costo: number;
  // Dato "embebido" que trae Supabase al pedir la relación
  activo?: { nombre: string; codigoqr: string | null } | null;
}

export interface EstadoCotizacion {
  idestadocotizacion: number;
  estadocotizacion: string;
}

export interface Cotizacion {
  idcotizacion: number;
  idempleado: number;
  idcontacto: number;
  idestadocotizacion: number;
  total: number;
  fechacreacion: string;
  fechainicio: string;
  fechafin: string;
  // Datos "embebidos" que trae Supabase al pedir la relación
  contacto?: {
    nombre: string;
    apellido: string;
    correo: string | null;
    telefono: string | null;
    empresa?: { nombre: string } | null;
  } | null;
  empleado?: { nombre: string; apellido: string } | null;
  estado?: { estadocotizacion: string } | null;
}

export interface DetalleCotizacion {
  iddetallecotizacion: number;
  idcotizacion: number;
  idtarifaactivo: number;
  cantidad: number;
  descuento: number;
  subtotal: number;
  tarifa?: {
    idcategoria: number;
    preciosemana: number;
    preciomes: number;
    preciodiaunico: number;
    preciodiaextra: number;
    categoria?: { nombre: string } | null;
  } | null;
}

export interface EstadoAlquiler {
  idestadoalquiler: number;
  estadoalquiler: string;
}

export interface Alquiler {
  idalquiler: number;
  idempleado: number;
  idcontacto: number;
  idcotizacion: number | null;
  idestadoalquiler: number;
  fechainicio: string;
  fechafinestimada: string;
  fechafinreal: string | null;
  totalestimado: number;
  totalreal: number;
  contacto?: {
    nombre: string;
    apellido: string;
    dpi?: string | null;
    telefono: string | null;
    correo?: string | null;
    empresa?: { nombre: string; nit?: string | null; direccion?: string | null } | null;
  } | null;
  empleado?: { nombre: string; apellido: string } | null;
  estado?: { estadoalquiler: string } | null;
}

export interface DetalleAlquiler {
  iddetallealquiler: number;
  idalquiler: number;
  idactivo: number;
  idtarifaactivo: number;
  iddetallecotizacion: number | null;
  fechadevolucion: string | null;
  descuento: number;
  subtotal: number;
  estadodevuelto: boolean | null; // null = pendiente, true = bien, false = dañado
  activo?: {
    nombre: string;
    codigoqr: string | null;
    categoria?: { nombre: string } | null;
  } | null;
  tarifa?: {
    idcategoria: number;
    preciosemana: number;
    preciomes: number;
    preciodiaunico: number;
    preciodiaextra: number;
  } | null;
  danios?: { idregistrodanio: number; descripcion: string; costo: number }[] | null;
}

export interface RegistroDanio {
  idregistrodanio: number;
  iddetallealquiler: number;
  descripcion: string;
  costo: number;
}