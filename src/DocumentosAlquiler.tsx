import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import type { Alquiler, DetalleAlquiler } from "../types/inventory";
import { formatearFecha, fmtQ } from "../types/format";

// ── DATOS DE LA EMPRESA ─────────────────────────────────────────────────────────
// Completa estos valores: aparecen en el encabezado y en las firmas.
// Lo que quede vacío se omite (o se imprime una línea en blanco para llenar a mano).
export const EMPRESA = {
  nombre: "ALQUILERES ATECA",
  nit: "1234567",
  direccion: "Zona 12",
  telefono: "15201220",
  ciudad: "Cobán, A. V.",         // ciudad para la fecha y la jurisdicción del contrato
  representante: "Dulce de la Cruz",  // nombre de quien firma por la empresa
};

const PAGE_STYLE = `
  @page { size: letter portrait; margin: 18mm 16mm; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-corte { break-inside: avoid; page-break-inside: avoid; }
    tr { break-inside: avoid; page-break-inside: avoid; }
  }
`;

// Uso: const { ref, imprimir } = useImprimir("Contrato_ALQ-0001");
//      <ZonaImpresion><ContratoAlquiler ref={ref} ... /></ZonaImpresion>
//      <button onClick={() => imprimir()}>Contrato</button>
export function useImprimir(titulo: string) {
  const ref = useRef<HTMLDivElement>(null);
  const imprimir = useReactToPrint({ contentRef: ref, documentTitle: titulo, pageStyle: PAGE_STYLE });
  return { ref, imprimir };
}

// Contenedor fuera de pantalla: el documento debe existir en el DOM para poder
// imprimirse, pero el usuario no lo ve.
export function ZonaImpresion({ children }: { children: React.ReactNode }) {
  return (
    <div aria-hidden="true" style={{ position: "fixed", left: "-10000px", top: 0, width: "816px" }}>
      {children}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

const numeroAlquiler = (id: number) => `ALQ-${String(id).padStart(4, "0")}`;
const fecha = (d?: string | null) => (d ? formatearFecha(d) || "—" : "—");
const BLANCO = "______________";

function hoyLocal() {
  const ahora = new Date();
  return new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function diasEntre(desde: string, hasta: string) {
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86400000);
}

function duracion(desde: string, hasta: string) {
  const total = Math.max(1, diasEntre(desde, hasta));
  const meses = Math.floor(total / 30);
  const semanas = Math.floor((total % 30) / 7);
  const dias = (total % 30) % 7;
  const partes = [
    meses ? `${meses} ${meses === 1 ? "mes" : "meses"}` : "",
    semanas ? `${semanas} ${semanas === 1 ? "semana" : "semanas"}` : "",
    dias ? `${dias} ${dias === 1 ? "día" : "días"}` : "",
  ].filter(Boolean);
  return partes.length ? partes.join(", ") : "1 día";
}

const costoDanios = (l: DetalleAlquiler) => (l.danios ?? []).reduce((s, d) => s + Number(d.costo), 0);

interface DocProps {
  alquiler: Alquiler;
  lineas: DetalleAlquiler[];
  ref?: React.Ref<HTMLDivElement>;
}

function Encabezado({ titulo, subtitulo }: { titulo: string; subtitulo: string }) {
  const datos = [
    EMPRESA.nit && `NIT ${EMPRESA.nit}`,
    EMPRESA.direccion,
    EMPRESA.telefono && `Tel. ${EMPRESA.telefono}`,
  ].filter(Boolean).join(" · ");
  return (
    <header className="text-center mb-4">
      <div className="text-lg font-bold uppercase">{EMPRESA.nombre}</div>
      {datos && <div className="text-[11px] text-gray-600">{datos}</div>}
      <h1 className="mt-3 text-base font-bold uppercase">{titulo}</h1>
      <div className="text-[11px]">{subtitulo}</div>
    </header>
  );
}

const th = "border border-gray-400 px-2 py-1 text-left font-bold bg-gray-100";
const td = "border border-gray-400 px-2 py-1 align-top";

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRATO
// ═══════════════════════════════════════════════════════════════════════════════
// Las cláusulas son una PLANTILLA GENERAL. Deben ser revisadas y ajustadas por
// la empresa (y su asesoría legal) antes de usarse como contrato formal.

export function ContratoAlquiler({ alquiler, lineas, ref }: DocProps) {
  const c = alquiler.contacto;
  const arrendatario = `${c?.nombre ?? ""} ${c?.apellido ?? ""}`.trim() || BLANCO;
  const empresaCliente = c?.empresa?.nombre ?? null;
  const numero = numeroAlquiler(alquiler.idalquiler);
  const ciudad = EMPRESA.ciudad || BLANCO;
  const plazo = duracion(alquiler.fechainicio, alquiler.fechafinestimada);

  const clausulas: { titulo: string; texto: string }[] = [
    {
      titulo: "PRIMERA – OBJETO",
      texto: "EL ARRENDADOR entrega en arrendamiento a EL ARRENDATARIO los equipos descritos en el cuadro anexo, de su propiedad y en buen estado de funcionamiento, para ser utilizados únicamente en el lugar y para los fines acordados entre las partes.",
    },
    {
      titulo: "SEGUNDA – PLAZO",
      texto: `El arrendamiento inicia el ${fecha(alquiler.fechainicio)} y tiene como fecha estimada de finalización el ${fecha(alquiler.fechafinestimada)} (${plazo}). El plazo concluye hasta que todos los equipos hayan sido devueltos a EL ARRENDADOR; cada devolución se hará constar por escrito.`,
    },
    {
      titulo: "TERCERA – PRECIO",
      texto: `El valor estimado del arrendamiento es de ${fmtQ(alquiler.totalestimado)}, calculado con las tarifas vigentes de cada categoría según el plazo pactado. Si la devolución se realiza antes o después de la fecha estimada, el valor se ajustará a los días realmente transcurridos; cada día adicional se cobrará a la tarifa de día extra indicada en el cuadro anexo.`,
    },
    {
      titulo: "CUARTA – ENTREGA Y DEVOLUCIÓN",
      texto: "EL ARRENDATARIO recibe los equipos a su satisfacción y se obliga a devolverlos en el mismo estado en que los recibió, salvo el desgaste normal por su uso, en las instalaciones de EL ARRENDADOR o donde éste indique. Las devoluciones podrán ser parciales y cada una se hará constar.",
    },
    {
      titulo: "QUINTA – USO Y CONSERVACIÓN",
      texto: "EL ARRENDATARIO se compromete a usar los equipos conforme a su naturaleza y capacidad, mediante personal capacitado, y a no subarrendarlos, cederlos ni trasladarlos a un lugar distinto del acordado sin autorización escrita de EL ARRENDADOR.",
    },
    {
      titulo: "SEXTA – DAÑOS, PÉRDIDA Y ROBO",
      texto: "EL ARRENDATARIO responde por los daños que sufran los equipos (distintos del desgaste normal), así como por su pérdida o robo mientras estén bajo su custodia. El costo de reparación o reposición, según evaluación de EL ARRENDADOR, se cobrará adicionalmente al valor del arrendamiento.",
    },
    {
      titulo: "SÉPTIMA – INCUMPLIMIENTO",
      texto: "El incumplimiento de cualquiera de las obligaciones de este contrato faculta a EL ARRENDADOR para darlo por terminado y exigir la devolución inmediata de los equipos, sin perjuicio del cobro de lo adeudado.",
    },
    {
      titulo: "OCTAVA – JURISDICCIÓN",
      texto: `Para la interpretación y cumplimiento de este contrato, las partes se someten a los tribunales competentes de ${ciudad}.`,
    },
  ];

  return (
    <div ref={ref} className="bg-white text-black font-serif text-[12px] leading-relaxed">
      <Encabezado
        titulo="Contrato de arrendamiento de equipo"
        subtitulo={`Contrato No. ${numero} · ${fecha(hoyLocal())}`}
      />

      <p className="text-justify mb-3">
        En {ciudad}, el {fecha(hoyLocal())}, comparecen: por una parte <strong>{EMPRESA.nombre}</strong>
        {EMPRESA.representante ? <>, representada por <strong>{EMPRESA.representante}</strong></> : null}, a quien en
        adelante se denominará <strong>EL ARRENDADOR</strong>; y por la otra <strong>{arrendatario}</strong>
        {empresaCliente ? <>, en representación de <strong>{empresaCliente}</strong>{c?.empresa?.nit ? ` (NIT ${c.empresa.nit})` : ""}</> : null}
        , identificado(a) con DPI No. <strong>{c?.dpi || BLANCO}</strong>, a quien en adelante se denominará{" "}
        <strong>EL ARRENDATARIO</strong>. Ambas partes convienen en celebrar el presente contrato de arrendamiento
        de equipo, sujeto a las cláusulas siguientes:
      </p>

      <table className="w-full border-collapse text-[11px] my-3 no-corte">
        <thead>
          <tr>
            {["No.", "Código", "Equipo", "Categoría", "Día extra", "Subtotal"].map((h) => (
              <th key={h} className={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lineas.map((l, i) => (
            <tr key={l.iddetallealquiler}>
              <td className={td}>{i + 1}</td>
              <td className={td}>{l.activo?.codigoqr ?? "—"}</td>
              <td className={td}>{l.activo?.nombre ?? "—"}</td>
              <td className={td}>{l.activo?.categoria?.nombre ?? "—"}</td>
              <td className={td}>{l.tarifa ? fmtQ(l.tarifa.preciodiaextra) : "—"}</td>
              <td className={td + " text-right"}>{fmtQ(l.subtotal)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5} className={td + " text-right font-bold"}>Total estimado</td>
            <td className={td + " text-right font-bold"}>{fmtQ(alquiler.totalestimado)}</td>
          </tr>
        </tfoot>
      </table>

      {clausulas.map((cl) => (
        <p key={cl.titulo} className="text-justify mb-2 no-corte">
          <strong>{cl.titulo}.</strong> {cl.texto}
        </p>
      ))}

      <p className="text-justify mt-3">
        Leído el presente contrato por ambas partes, lo aceptan en todas sus cláusulas y lo firman en dos ejemplares.
      </p>

      <div className="grid grid-cols-2 gap-10 mt-16 text-center text-[11px] no-corte">
        <div className="border-t border-black pt-1">
          <div className="font-bold">EL ARRENDADOR</div>
          <div>{EMPRESA.representante || EMPRESA.nombre}</div>
        </div>
        <div className="border-t border-black pt-1">
          <div className="font-bold">EL ARRENDATARIO</div>
          <div>{arrendatario}</div>
          <div>DPI: {c?.dpi || BLANCO}</div>
        </div>
      </div>

      {alquiler.empleado && (
        <p className="mt-6 text-[10px] text-gray-600 text-center">
          Atendido por: {alquiler.empleado.nombre} {alquiler.empleado.apellido}
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANCIA DE DEVOLUCIÓN
// ═══════════════════════════════════════════════════════════════════════════════

export function ConstanciaDevolucion({ alquiler, lineas, ref }: DocProps) {
  const c = alquiler.contacto;
  const arrendatario = `${c?.nombre ?? ""} ${c?.apellido ?? ""}`.trim() || BLANCO;
  const empresaCliente = c?.empresa?.nombre ?? null;
  const numero = numeroAlquiler(alquiler.idalquiler);

  const totalAlquiler = lineas.reduce((s, l) => s + Number(l.subtotal), 0);
  const totalDanios = lineas.reduce((s, l) => s + costoDanios(l), 0);
  const hayDanios = lineas.some((l) => l.estadodevuelto === false);
  const dif = alquiler.fechafinreal ? diasEntre(alquiler.fechafinestimada, alquiler.fechafinreal) : 0;
  const puntualidad =
    dif > 0 ? `con ${dif} día(s) de retraso respecto a la fecha estimada`
    : dif < 0 ? `${Math.abs(dif)} día(s) antes de la fecha estimada`
    : "en la fecha estimada";

  return (
    <div ref={ref} className="bg-white text-black font-serif text-[12px] leading-relaxed">
      <Encabezado
        titulo="Constancia de devolución de equipo"
        subtitulo={`Alquiler No. ${numero} · Emitida el ${fecha(hoyLocal())}`}
      />

      <table className="w-full border-collapse text-[11px] mb-3 no-corte">
        <tbody>
          <tr>
            <td className={td + " font-bold w-1/4"}>Arrendatario</td>
            <td className={td}>{arrendatario}{empresaCliente ? ` — ${empresaCliente}` : ""}</td>
            <td className={td + " font-bold w-1/6"}>DPI</td>
            <td className={td}>{c?.dpi || "—"}</td>
          </tr>
          <tr>
            <td className={td + " font-bold"}>Inicio del alquiler</td>
            <td className={td}>{fecha(alquiler.fechainicio)}</td>
            <td className={td + " font-bold"}>Fin estimado</td>
            <td className={td}>{fecha(alquiler.fechafinestimada)}</td>
          </tr>
          <tr>
            <td className={td + " font-bold"}>Fin real (última devolución)</td>
            <td className={td} colSpan={3}>{fecha(alquiler.fechafinreal)}</td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse text-[11px] my-3">
        <thead>
          <tr>
            {["Código", "Equipo", "Devuelto el", "Estado", "Alquiler", "Daño"].map((h) => (
              <th key={h} className={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lineas.map((l) => (
            <tr key={l.iddetallealquiler}>
              <td className={td}>{l.activo?.codigoqr ?? "—"}</td>
              <td className={td}>
                {l.activo?.nombre ?? "—"}
                {(l.danios ?? []).map((d) => (
                  <div key={d.idregistrodanio} className="text-[10px] text-gray-700">Daño: {d.descripcion}</div>
                ))}
              </td>
              <td className={td}>{fecha(l.fechadevolucion)}</td>
              <td className={td}>{l.estadodevuelto === true ? "Buen estado" : l.estadodevuelto === false ? "Con daños" : "Pendiente"}</td>
              <td className={td + " text-right"}>{fmtQ(l.subtotal)}</td>
              <td className={td + " text-right"}>{costoDanios(l) > 0 ? fmtQ(costoDanios(l)) : "—"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} className={td + " text-right font-bold"}>Totales</td>
            <td className={td + " text-right font-bold"}>{fmtQ(totalAlquiler)}</td>
            <td className={td + " text-right font-bold"}>{fmtQ(totalDanios)}</td>
          </tr>
          <tr>
            <td colSpan={4} className={td + " text-right font-bold"}>TOTAL FINAL A PAGAR</td>
            <td colSpan={2} className={td + " text-right font-bold"}>{fmtQ(alquiler.totalreal)}</td>
          </tr>
        </tfoot>
      </table>

      <p className="text-justify mt-3 no-corte">
        EL ARRENDADOR hace constar que EL ARRENDATARIO devolvió la totalidad de los equipos detallados, {puntualidad}
        {hayDanios ? ", con las observaciones por daños indicadas en el cuadro anterior, cuyo costo se incluye en el total final" : ", sin observaciones por daños"}.
        Con la firma de este documento ambas partes dan por concluida la entrega y recepción de los equipos.
      </p>

      <div className="grid grid-cols-2 gap-10 mt-16 text-center text-[11px] no-corte">
        <div className="border-t border-black pt-1">
          <div className="font-bold">RECIBIDO POR EL ARRENDADOR</div>
          <div>{alquiler.empleado ? `${alquiler.empleado.nombre} ${alquiler.empleado.apellido}` : EMPRESA.nombre}</div>
        </div>
        <div className="border-t border-black pt-1">
          <div className="font-bold">ENTREGADO POR EL ARRENDATARIO</div>
          <div>{arrendatario}</div>
        </div>
      </div>
    </div>
  );
}