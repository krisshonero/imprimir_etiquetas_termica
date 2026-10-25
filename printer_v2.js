const { printer: ThermalPrinter, types: PrinterTypes } = require("node-thermal-printer");
const fs = require("fs");
const config = require("./config");

// =====================================================================
// printer_v2.js -- impresión del ticket V2 (main_v2.js).
// Igual que printer.js (misma librería, misma impresora, mismo envío por
// el recurso compartido), pero las líneas "N: ..." (números de pedido) y
// "CODIGO: ..." (código de descuento) salen en negrita y a doble tamaño.
// printer.js queda sin cambios para main.js.
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
      encoding: config.encoding || 'GB18030',
      // Tabla de caracteres explícita: es la misma que la librería termina
      // eligiendo sola (mismos bytes impresos), pero así no escribe en consola
      // "Encoding not recognized: 'undefined'" en cada ticket.
      characterSet: 'PC437_USA'
    });

    printer.clear();
    printer.alignCenter();

    // Se imprime en tramos: texto normal y, destacadas, las líneas del
    // número de pedido y del código de descuento
    const destacada = (l) => l.trim().startsWith('N: ') || l.trim().startsWith('CODIGO: ');
    const lineas = String(content).split('\n');
    if (!lineas.some(destacada)) {
      printer.println(content);
    } else {
      let tramo = [];
      const imprimirTramo = () => { if (tramo.length) printer.println(tramo.join('\n')); tramo = []; };
      lineas.forEach(l => {
        if (!destacada(l)) { tramo.push(l); return; }
        imprimirTramo();
        const linea = l.trim();
        printer.bold(true);
        // Doble alto y ancho si cabe en una línea; si no, solo doble alto
        if (linea.length <= ANCHO_DOBLE) printer.setTextQuadArea();
        else printer.setTextDoubleHeight();
        printer.println(linea); // si no cabe, la impresora sigue en la línea siguiente
        printer.setTextNormal();
        printer.bold(false);
      });
      imprimirTramo();
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
