const axios = require("axios"); // npm install axios
const config = require("./config");
const {
    printTicket
} = require("./printer");

let isPrinting = false; // Evita solapamiento de impresiones
let shouldPrint = false
const ANCHO = 42; // Ancho del ticket en caracteres
/**
 * Consulta la URL y, si la respuesta indica impresión, ejecuta la impresión.
 */

const CAFETERIA_NOMBRE = "Cafetería Distrito Urbano";

async function poll() {
    if (isPrinting) {
        console.log("⏳ Impresión en curso, se omite esta iteración.");
        return;
    }

    try {
        console.log(`🔄 Consultando ${config.pollingUrl} ...`);
        const resp = await axios.post(config.pollingUrl, {
            in_sucursal: 'velora'
        }, {
            timeout: 10000 // 10 segundos
        });

        if (resp.data.res_status == 'E') throw new Error('error al consultar URL ' + resp.data.message)
        if (resp.data.res_status == 'S' && resp.data.message == 'no_existen_registros') {
            shouldPrint = false
        } else {
            shouldPrint = true
        }

        if (resp.data.res_status === 'E') {
            throw new Error('Error al consultar URL: ' + resp.data.message);
        }

        // Si no hay registros, no imprimir
        if (resp.data.res_status === 'S' && resp.data.message === 'no_existen_registros') {
            console.log("⏭️ No hay órdenes de impresión pendientes.");
            return;
        }

        const data = resp.data.data;
        if (!data || data.length === 0) {
            console.log("⏭️ Datos vacíos, no se imprime.");
            return;
        }

        // Agrupar por mesa
        const grupos = {};
        data.forEach(row => {
            const mesa = row.mesa;
            if (!grupos[mesa]) {
                grupos[mesa] = {
                    items: [],
                    pedidos: new Set()
                };
            }
            grupos[mesa].items.push(row);
            if (row.id_pedido) {
                grupos[mesa].pedidos.add(row.id_pedido);
            }
        });
        isPrinting = true;
        console.log(`📨 Recibida orden de impresión. ${Object.keys(grupos).length} mesa(s) con items.`);

        // Generar y enviar un ticket por cada mesa
         for (const [mesa, grupo] of Object.entries(grupos)) {
            const pedidosIds = Array.from(grupo.pedidos).sort((a, b) => a - b);
            const ticketContent = generarTicket(mesa, grupo.items, pedidosIds);
            console.log(`🖨️ Imprimiendo ticket para mesa: ${mesa} (${grupo.items.length} items, ${pedidosIds.length} pedido(s))`);
            await printTicket(ticketContent);
        }

        isPrinting = false;
    } catch (error) {
        console.error("❌ Error en el polling:", error.message);
        // Si la URL no responde, podrías reintentar después sin detener el servicio
    }
}

/**
 * Inicia el servicio de polling.
 */
function startPolling() {
    console.log(`🚀 Servicio iniciado. Consultando cada ${config.pollingInterval / 1000} segundos.`);
    // Ejecuta inmediatamente la primera vez
    poll();
    // Luego programa intervalos
    setInterval(poll, config.pollingInterval);
}

// Manejo de terminación limpia
process.on("SIGINT", () => {
    console.log("\n🛑 Deteniendo servicio...");
    process.exit(0);
});

function centrar(texto) {
    const pad = Math.max(0, (ANCHO - texto.length) / 2);
    return ' '.repeat(Math.floor(pad)) + texto + ' '.repeat(Math.ceil(pad));
}

function generarTicket(mesa, items, pedidosIds) {
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString('es-CL'); // dd-mm-yyyy

    // Calcular totales
    let subtotal = 0;
    let lineasItems = [];
    items.forEach(item => {
        const valor = parseInt(item.valor) || 0;
        subtotal += valor;
        // Nombre: máximo 22 caracteres, precio: 10 caracteres (incluyendo signo $)
        const nombre = item.receta.substring(0, 22).padEnd(22, ' ');
        const precioStr = `$${valor}`.padStart(16, ' ');
        lineasItems.push(`${nombre}${precioStr}`);
    });

    const propina = Math.round(subtotal * 0.1);
    const total = subtotal + propina;

    const lineaSeparadora = '─'.repeat(ANCHO);

    // Construir ticket
    let ticket = '';
    ticket += centrar(CAFETERIA_NOMBRE) + '\n';
    ticket += centrar(`Orden: ${mesa}`) + '\n';
    // Añadir línea con IDs de pedido (N: ...)
    if (pedidosIds && pedidosIds.length > 0) {
        const idsStr = pedidosIds.join(', ');
        ticket += centrar(`N: ${idsStr}`) + '\n';
    }
    ticket += centrar(`Fecha: ${fecha}`) + '\n';
    
    ticket += lineaSeparadora + '\n';

    // Items
    lineasItems.forEach(line => {
        ticket += line + '\n';
    });

    ticket += lineaSeparadora + '\n';

    // Totales (alineados a la derecha)
    const subtotalStr = `$${subtotal}`;
    const propinaStr = `$${propina}`;
    const totalStr = `$${total}`;

    ticket += 'Sub-Total (IVA inc.): '.padStart(ANCHO - subtotalStr.length) + subtotalStr + '\n';
    ticket += 'Prop. sug. (10%): '.padStart(ANCHO - propinaStr.length) + propinaStr + '\n';
    ticket += 'Total: '.padStart(ANCHO - totalStr.length) + totalStr + '\n';

    ticket += lineaSeparadora + '\n';
    ticket += centrar('Gracias por tu compra') + '\n';
    ticket += '\n'; // Salto extra para separar tickets

    return ticket;
}

startPolling();