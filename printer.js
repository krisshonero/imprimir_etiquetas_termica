const { printer: ThermalPrinter, types: PrinterTypes } = require("node-thermal-printer");
const fs = require("fs");
const config = require("./config");

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
    // Puedes personalizar el encabezado fijo
    printer.println("================================");
    printer.println("   DISTRITO URBANO   ");
    printer.println("================================");
    printer.println(content);
    printer.cut();

    const rawBuffer = printer.getBuffer();
    fs.writeFileSync(config.printerPath, rawBuffer);
    console.log("✅ Ticket impreso correctamente.");
  } catch (error) {
    console.error("❌ Error al imprimir:", error.message);
    throw error; // para que el polling pueda manejar el fallo
  }
}

module.exports = { printTicket };