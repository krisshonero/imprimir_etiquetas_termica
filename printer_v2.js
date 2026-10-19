const { printer: ThermalPrinter, types: PrinterTypes } = require("node-thermal-printer");
const fs = require("fs");
const config = require("./config");

// =====================================================================
// printer_v2.js -- impresión del ticket V2 (main_v2.js).
// Igual que printer.js (misma librería, misma impresora, mismo envío por
// el recurso compartido), pero la línea "N: ..." (números de pedido) sale
// en negrita y a doble tamaño. printer.js queda sin cambios para main.js.
// =====================================================================

const ANCHO_DOBLE = 21;    // a doble ancho caben la mitad

/**
 * Imprime un ticket con el contenido dado.
 * @param {string} content - Texto a imprimir (puede incluir saltos de línea).
 */
async function printTicket(content) {
  try {
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: 'none',
      encoding: config.encoding || 'GB18030'
    });

    printer.clear();
    printer.alignCenter();

    // Se imprime en tramos: lo anterior al número, el número destacado y el resto
    const lineas = String(content).split('\n');
    const iNumero = lineas.findIndex(l => l.trim().startsWith('N: '));
    if (iNumero === -1) {
      printer.println(content);
    } else {
      printer.println(lineas.slice(0, iNumero).join('\n'));
      const numero = lineas[iNumero].trim();
      printer.bold(true);
      // Doble alto y ancho si cabe en una línea; si no, solo doble alto
      if (numero.length <= ANCHO_DOBLE) printer.setTextQuadArea();
      else printer.setTextDoubleHeight();
      printer.println(numero); // si no cabe, la impresora sigue en la línea siguiente
      printer.setTextNormal();
      printer.bold(false);
      printer.println(lineas.slice(iNumero + 1).join('\n'));
    }
    printer.cut();

    const rawBuffer = printer.getBuffer();
    fs.writeFileSync(config.printerPath, rawBuffer);
    console.log("✅ Ticket impreso correctamente.");
  } catch (error) {
    console.error("❌ Error al imprimir:", error.message);
    throw error; // para que el servicio pueda manejar el fallo
  }
}

module.exports = { printTicket };
