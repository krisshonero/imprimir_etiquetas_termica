// =====================================================================
// ticket_v2.js -- arma el texto del ticket. Mismo formato que
// generarTicket() de main.js (que no se puede importar porque main.js
// inicia su propio servicio al cargarse).
// =====================================================================
const ANCHO = 42; // Ancho del ticket en caracteres
const EMPRESA = "   DISTRITO URBANO   ";
const CAFETERIA_NOMBRE = "Velora Cafetería";

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
        const nombre = String(item.receta_nombre || item.receta || '').substring(0, 22).padEnd(22, ' ');
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

module.exports = { generarTicket };
