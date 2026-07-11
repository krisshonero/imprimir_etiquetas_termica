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
const EMPRESA = "   DISTRITO URBANO   ";
const CAFETERIA_NOMBRE = "Velora Cafetería";

async function poll() {
    if (isPrinting) {
        console.log("⏳ Impresión en curso, se omite esta iteración.");
        return;
    }

    try {
        // 1. Obtener los tickets activos (mesas con pedidos a imprimir)
        console.log(`🔄 Consultando ${config.cliente_mesas_ticket_obtener} ...`);
        const respTicket = await axios.post(config.cliente_mesas_ticket_obtener, {
            in_sucursal: 'velora'
        }, {
            timeout: 10000
        });

        if (respTicket.data.res_status === 'E') {
            throw new Error('Error al consultar tickets: ' + respTicket.data.message);
        }

        // Si no hay tickets, no imprimir nada
        if (respTicket.data.res_status === 'S' && respTicket.data.message === 'no_existen_registros') {
            console.log("⏭️ No hay tickets pendientes.");
            return;
        }

        // Construir mapa: mesa -> Set de id_pedido permitidos
        const pedidosPermitidosPorMesa = {};
        respTicket.data.data.forEach(record => {
            const mesa = record.mesa; // identificador de la mesa
            const pedidosStr = record.pedidos; // string con IDs separados por coma
            if (!pedidosStr) return;

            // Convertir el string a array de números
            const ids = pedidosStr.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            if (ids.length === 0) return;

            if (!pedidosPermitidosPorMesa[mesa]) {
                pedidosPermitidosPorMesa[mesa] = new Set();
            }
            ids.forEach(id => pedidosPermitidosPorMesa[mesa].add(id));
        });

        // 2. Obtener los datos de impresión (mesas con imprimir=1)
        console.log(`🔄 Consultando ${config.cliente_mesas_imprimir_obtener} ...`);
        const resp = await axios.post(config.cliente_mesas_imprimir_obtener, {
            in_sucursal: 'velora'
        }, {
            timeout: 10000
        });

        if (resp.data.res_status === 'E') {
            throw new Error('Error al consultar URL: ' + resp.data.message);
        }

        if (resp.data.res_status === 'S' && resp.data.message === 'no_existen_registros') {
            console.log("⏭️ No hay órdenes de impresión pendientes.");
            return;
        }

        const data = resp.data.data;
        if (!data || data.length === 0) {
            console.log("⏭️ Datos vacíos, no se imprime.");
            return;
        }

        // 3. Filtrar los datos: solo mantener los id_pedido que están en los tickets
        const dataFiltrada = data.filter(row => {
            const mesa = row.mesa; // identificador de la mesa
            const idPedido = row.id_pedido;
            // Verificar si la mesa tiene ticket y si el id_pedido está en el Set
            return pedidosPermitidosPorMesa[mesa] && pedidosPermitidosPorMesa[mesa].has(idPedido);
        });

        if (dataFiltrada.length === 0) {
            console.log("⏭️ Después de filtrar, no quedan items para imprimir.");
            return;
        }

        // 4. Agrupar por mesa (usando mesa_nombre para mostrar en el ticket)
        const grupos = {};
        dataFiltrada.forEach(row => {
            const mesaNombre = row.mesa_nombre || row.mesa; // fallback al identificador si falta nombre
            if (!grupos[mesaNombre]) {
                grupos[mesaNombre] = {
                    items: [],
                    pedidos: new Set()
                };
            }
            grupos[mesaNombre].items.push(row);
            if (row.id_pedido) {
                grupos[mesaNombre].pedidos.add(row.id_pedido);
            }
        });

        isPrinting = true;
        console.log(`📨 Recibida orden de impresión. ${Object.keys(grupos).length} mesa(s) con items.`);

        // 5. Generar y enviar un ticket por cada mesa
        for (const [mesaNombre, grupo] of Object.entries(grupos)) {
            const pedidosIds = Array.from(grupo.pedidos).sort((a, b) => a - b);
            const ticketContent = generarTicket(mesaNombre, grupo.items, pedidosIds);
            console.log(`🖨️ Imprimiendo ticket para mesa: ${mesaNombre} (${grupo.items.length} items, ${pedidosIds.length} pedido(s))`);
            await printTicket(ticketContent);
        }

        isPrinting = false;

    } catch (error) {
        console.error("❌ Error en el polling:", error.message);
        isPrinting = false; // Asegurar que se libere el flag
    }
}

async function poll_old() {
    if (isPrinting) {
        console.log("⏳ Impresión en curso, se omite esta iteración.");
        return;
    }

    try {
        console.log(`🔄 Consultando ${config.cliente_mesas_ticket_obtener} ...`);
        const resp1 = await axios.post(config.cliente_mesas_ticket_obtener, {
            in_sucursal: 'velora'
        }, {
            timeout: 10000 // 10 segundos
        });
        console.log(`🔄 Consultando ${config.cliente_mesas_imprimir_obtener} ...`);
        const resp = await axios.post(config.cliente_mesas_imprimir_obtener, {
            in_sucursal: 'velora'
        }, {
            timeout: 10000 // 10 segundos
        });

        if (resp1.data.res_status == 'E') throw new Error('error al consultar URL resp1 ' + resp1.data.message) 
        if (resp.data.res_status === 'E') throw new Error('Error al consultar URL: ' + resp.data.message);
        
        if (resp1.data.res_status == 'S' && resp1.data.message == 'no_existen_registros') {
            console.log("⏭️ No hay órdenes de impresión pendientes.");
            shouldPrint = false
            return;
        }
        // Si no hay registros, no imprimir
        if (resp.data.res_status === 'S' && resp.data.message === 'no_existen_registros') {
            console.log("⏭️ No hay órdenes de impresión pendientes.");
            shouldPrint = false
            return;
        }else {
            shouldPrint = true
        }

        const data = resp.data.data;
        if (!data || data.length === 0) {
            console.log("⏭️ Datos vacíos, no se imprime.");
            return;
        }

        // Agrupar por mesa
        const grupos = {};
        data.forEach(row => {
            const mesa = row.mesa_nombre;
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
        const nombre = item.receta_nombre.substring(0, 22).padEnd(22, ' ');
        const precioStr = `$${valor}`.padStart(20, ' ');
        lineasItems.push(`${nombre}${precioStr}`);
    });

    const propina = mesa.toLowerCase().includes('auto')?0:Math.round(subtotal * 0.1);
    const total = subtotal + propina;

    const lineaSeparadora = '─'.repeat(ANCHO);

    const lineaSeparadora2 = '='.repeat(ANCHO);

    // Construir ticket
    let ticket = '';
    ticket += lineaSeparadora2 + '\n';
    ticket += centrar(EMPRESA) + '\n';
    ticket += lineaSeparadora2 + '\n';
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

    

    ticket += mesa.toLowerCase().includes('auto')?'':'Sub-Total (IVA inc.): '.padStart(ANCHO - subtotalStr.length) + subtotalStr + '\n';
    ticket += mesa.toLowerCase().includes('auto')?'':'Prop. sug. (10%): '.padStart(ANCHO - propinaStr.length) + propinaStr + '\n';
    ticket += ('Total '+(mesa.toLowerCase().includes('auto')?'(IVA inc.):':':')).padStart(ANCHO - totalStr.length) + totalStr + '\n';

    ticket += lineaSeparadora + '\n';
    ticket += centrar('Gracias por tu compra') + '\n';
    ticket += '\n'; // Salto extra para separar tickets

    return ticket;
}

startPolling();