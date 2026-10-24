// Cantidades de dígitos exigidas. Si cambia la regla, se cambia aquí
// (y en la constraint SQL de 08-validaciones-empleado.sql).
export const DPI_DIGITOS = 13;
export const TELEFONO_DIGITOS = 8;

export const soloDigitos = (v: string) => v.replace(/\D/g, "");

// Todos los validadores devuelven null si el valor es válido (o si
// está vacío, porque estos campos son opcionales) o un mensaje de error.

export function validarDpi(v: string): string | null {
  const valor = v.trim();
  if (!valor) return null;
  // Se aceptan espacios (0000 00000 0000) pero no letras ni símbolos.
  if (!/^[\d\s]+$/.test(valor)) return "El DPI solo puede contener números.";
  return soloDigitos(valor).length === DPI_DIGITOS
    ? null
    : `El DPI debe tener ${DPI_DIGITOS} dígitos (tiene ${soloDigitos(valor).length}).`;
}

export function validarTelefono(v: string): string | null {
  const valor = v.trim();
  if (!valor) return null;
  // Se aceptan espacios, guiones, paréntesis y + (ej. +502 5555-1234).
  if (!/^[\d\s\-+()]+$/.test(valor)) return "El teléfono solo puede contener números.";
  return soloDigitos(valor).length === TELEFONO_DIGITOS
    ? null
    : `El teléfono debe tener ${TELEFONO_DIGITOS} dígitos (tiene ${soloDigitos(valor).length}).`;
}

export function validarCorreo(v: string): string | null {
  const valor = v.trim();
  if (!valor) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor) ? null : "El correo no tiene un formato válido.";
}

export const NIT_DIGITOS = 7;

export function validarNit(v: string): string | null {
  const valor = v.trim();
  if (!valor) return null;

  if (!/^[\d\s-]+$/.test(valor)) {
    return "El NIT solo puede contener números.";
  }

  const digitos = soloDigitos(valor);

  return digitos.length === NIT_DIGITOS
    ? null
    : `El NIT debe tener ${NIT_DIGITOS} dígitos (tiene ${digitos.length}).`;
}

// Lo que se guarda: DPI y teléfono solo con dígitos, correo en minúsculas
// (Supabase Auth trata los correos sin distinguir mayúsculas).
export const normalizarDigitos = (v: string) => (v.trim() ? soloDigitos(v) : null);
export const normalizarCorreo = (v: string) => (v.trim() ? v.trim().toLowerCase() : null);