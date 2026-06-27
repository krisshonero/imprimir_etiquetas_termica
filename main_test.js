const ThermalPrinter = require("node-thermal-printer").printer;
const PrinterTypes = require("node-thermal-printer").types;
const fs = require("fs");

async function test() {
    try {        
        console.log("⏳ Generando buffer de comandos ESC/POS...");

        // 1. CORRECCIÓN: El encoding va en la raíz de la configuración
        const printer = new ThermalPrinter({
            type: PrinterTypes.EPSON,
            interface: 'none', 
            encoding: 'GB18030' // Soluciona el error de iconv-lite 'undefined'
        });

        printer.clear(); 
        
        // Estructura del ticket de prueba
        printer.alignCenter();
        printer.println("================================");
        printer.println("   DISTRITO URBANO APP");
        printer.println("   ¡CONEXIÓN RAW WINDOWS!");
        printer.println("================================");
        printer.cut();
        
        // Extraemos los bytes generados por la librería
        const rawBuffer = printer.getBuffer();
        
        // 2. CORRECCIÓN: Apuntamos al recurso compartido local de Windows
        // Asegúrate de haber completado el Paso 1 (Compartir impresora)
        const printerNetworkPath = "\\\\localhost\\POS-80";

        console.log(`Enviando bytes directamente a ${printerNetworkPath}...`);
        
        // Escribimos directamente en el puerto lógico de la impresora compartida
        fs.writeFileSync(printerNetworkPath, rawBuffer);

        console.log(`✅ ¡Éxito! Comandos enviados a la cola de Windows de forma directa.`);

    } catch (error) {
        console.error("❌ Falló la impresión:", error.message);
    }
}

test();