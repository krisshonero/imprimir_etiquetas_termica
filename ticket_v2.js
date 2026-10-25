// =====================================================================
// ticket_v2.js -- arma el texto del ticket. Mismo formato que
// generarTicket() de main.js (que no se puede importar porque main.js
// inicia su propio servicio al cargarse).
//
// descuento (opcional, lo envía el servidor):
//   { aplicado: { porcentaje, tope, monto } } -> línea de descuento; la
//       propina sugerida se calcula sobre el total con descuento
//   { codigo: { codigo, porcentaje, tope, expira } } -> código para la
//       próxima compra al final del ticket
// =====================================================================
const ANCHO = 42; // Ancho del ticket en caracteres
const EMPRESA = "   DISTRITO URBANO   ";
const CAFETERIA_NOMBRE = "Velora Cafetería";

function centrar(texto) {
    const pad = Math.max(0, (ANCHO - texto.length) / 2);
    return ' '.repeat(Math.floor(pad)) + texto + ' '.repeat(Math.ceil(pad));
}

function generarTicket(mesa, items, pedidosIds, descuento) {
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

    const aplicado = descuento && descuento.aplicado ? descuento.aplicado : null;
    const montoDescuento = aplicado ? Math.max(0, Math.min(parseInt(aplicado.monto) || 0, subtotal)) : 0;
    const conDescuento = subtotal - montoDescuento;

    const propina = mesa.toLowerCase().includes('auto')?0:Math.round(conDescuento * 0.1);
    const total = conDescuento + propina;

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

    if (aplicado) {
        const descStr = `-$${montoDescuento}`;
        const conDescStr = `$${conDescuento}`;
        ticket += 'Sub-Total: '.padStart(ANCHO - subtotalStr.length) + subtotalStr + '\n';
        ticket += `Descuento (${aplicado.porcentaje}%): `.padStart(ANCHO - descStr.length) + descStr + '\n';
        ticket += mesa.toLowerCase().includes('auto')?'':'Total desc. (IVA inc.): '.padStart(ANCHO - conDescStr.length) + conDescStr + '\n';
    } else {
        ticket += mesa.toLowerCase().includes('auto')?'':'Sub-Total (IVA inc.): '.padStart(ANCHO - subtotalStr.length) + subtotalStr + '\n';
    }
    ticket += mesa.toLowerCase().includes('auto')?'':'Prop. sug. (10%): '.padStart(ANCHO - propinaStr.length) + propinaStr + '\n';
    ticket += ('Total '+(mesa.toLowerCase().includes('auto')?'(IVA inc.):':':')).padStart(ANCHO - totalStr.length) + totalStr + '\n';

    ticket += lineaSeparadora + '\n';
    ticket += centrar('Gracias por tu compra') + '\n';

    // Código de descuento para la próxima compra
    const codigo = descuento && descuento.codigo ? descuento.codigo : null;
    if (codigo && codigo.codigo) {
        ticket += lineaSeparadora2 + '\n';
        ticket += centrar('Tu próxima compra con') + '\n';
        ticket += centrar(`${codigo.porcentaje}% de descuento`) + '\n';
        ticket += centrar(`CODIGO: ${codigo.codigo}`) + '\n';
        ticket += centrar(`Descuento máximo $${codigo.tope}`) + '\n';
        ticket += centrar(`Válido hasta el ${codigo.expira}`) + '\n';
        ticket += centrar('Un solo uso. No acumulable.') + '\n';
        ticket += lineaSeparadora2 + '\n';
    }
    ticket += '\n'; // Salto extra para separar tickets

    return ticket;
}

module.exports = { generarTicket };
