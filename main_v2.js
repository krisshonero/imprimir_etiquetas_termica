// =====================================================================
// main_v2.js -- Servicio de impresión de tickets V2.
//
// Reemplaza a main.js (que se mantiene intacto para volver atrás) usando
// la cola del servidor:
//   1. POST /impresion_v2_reservar  -> trabajos pendientes (reservados 60 s)
//   2. imprime cada uno con printer.js (sin cambios)
//   3. POST /impresion_v2_confirmar -> impreso | error
//
// Garantías:
//  - Las consultas nunca se solapan (ciclo que espera a que termine cada
//    vuelta, en vez de setInterval).
//  - Si la impresión falla, el trabajo vuelve a la cola del servidor y se
//    reintenta (5, 15, 30, 60 s; hasta 5 intentos).
//  - Si se imprimió pero no llegó la confirmación (internet), el trabajo
//    queda anotado en impresos_v2.json: al volver se confirma sin imprimir
//    de nuevo.
//  - Todo queda en logs/impresion-AAAA-MM-DD.log.
//
// La clave de acceso va en impresion_v2.env (IMPRESION_V2_API_KEY), que no
// se sube a git. Ver LEEME_IMPRESION_V2.txt.
// =====================================================================

const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "impresion_v2.env"), quiet: true });
const axios = require("axios");
const cfg = require("./config_v2");
const { printTicket } = require("./printer");
const { generarTicket } = require("./ticket_v2");

const API_KEY = process.env.IMPRESION_V2_API_KEY || "";
const DIR_LOGS = path.join(__dirname, "logs");
const ARCHIVO_IMPRESOS = path.join(__dirname, "impresos_v2.json");
const MAX_IMPRESOS = 500;

// ---------------------------------------------------------------------
// Log a consola y a archivo diario
// ---------------------------------------------------------------------
const pad2 = (n) => String(n).padStart(2, "0");
function fechaLocal(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function horaLocal(d) { return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`; }

function log(nivel, mensaje) {
    const ahora = new Date();
    const linea = `[${fechaLocal(ahora)} ${horaLocal(ahora)}] ${nivel} ${mensaje}`;
    (nivel === "ERROR" ? console.error : console.log)(linea);
    try {
        if (!fs.existsSync(DIR_LOGS)) fs.mkdirSync(DIR_LOGS, { recursive: true });
        fs.appendFileSync(path.join(DIR_LOGS, `impresion-${fechaLocal(ahora)}.log`), linea + "\n");
    } catch (e) { /* el log nunca debe detener la impresión */ }
}

function limpiarLogsAntiguos() {
    try {
        if (!fs.existsSync(DIR_LOGS)) return;
        const limite = Date.now() - cfg.diasLog * 24 * 3600 * 1000;
        fs.readdirSync(DIR_LOGS).forEach(f => {
            const p = path.join(DIR_LOGS, f);
            if (fs.statSync(p).mtimeMs < limite) fs.unlinkSync(p);
        });
    } catch (e) { log("WARN", `No se pudieron limpiar logs antiguos: ${e.message}`); }
}

// ---------------------------------------------------------------------
// Trabajos ya impresos (evita imprimir dos veces si no llegó la confirmación)
// ---------------------------------------------------------------------
let impresos = {};
function cargarImpresos() {
    try {
        if (fs.existsSync(ARCHIVO_IMPRESOS)) impresos = JSON.parse(fs.readFileSync(ARCHIVO_IMPRESOS, "utf8")) || {};
    } catch (e) {
        log("WARN", `impresos_v2.json ilegible, se reinicia: ${e.message}`);
        impresos = {};
    }
}
function marcarImpreso(id) {
    impresos[id] = new Date().toISOString();
    const ids = Object.keys(impresos);
    if (ids.length > MAX_IMPRESOS) {
        ids.sort((a, b) => impresos[a].localeCompare(impresos[b])).slice(0, ids.length - MAX_IMPRESOS).forEach(k => delete impresos[k]);
    }
    try { fs.writeFileSync(ARCHIVO_IMPRESOS, JSON.stringify(impresos)); }
    catch (e) { log("WARN", `No se pudo guardar impresos_v2.json: ${e.message}`); }
}

// ---------------------------------------------------------------------
// Servidor
// ---------------------------------------------------------------------
function post(ruta, body) {
    return axios.post(`${cfg.servidor}${ruta}`, body, {
        timeout: cfg.timeoutMs,
        headers: { "x-api-key": API_KEY }
    });
}

// Confirmaciones que no llegaron al servidor: se reintentan en cada vuelta
const confirmacionesPendientes = new Map(); // id_trabajo -> {id_trabajo, lote, resultado, detalle}

async function confirmar(trabajo, resultado, detalle) {
    const body = { id_trabajo: trabajo.id_trabajo, lote: trabajo.lote, dispositivo: cfg.dispositivo, resultado, detalle: String(detalle || "").substring(0, 255) };
    try {
        const r = await post("/impresion_v2_confirmar", body);
        if (r.data.res_status !== "S") throw new Error(r.data.message || "respuesta_invalida");
        confirmacionesPendientes.delete(trabajo.id_trabajo);
        return true;
    } catch (e) {
        confirmacionesPendientes.set(trabajo.id_trabajo, body);
        log("WARN", `Ticket #${trabajo.id_trabajo}: no se pudo confirmar "${resultado}" (${e.message}); se reintentará.`);
        return false;
    }
}

async function reintentarConfirmaciones() {
    for (const body of [...confirmacionesPendientes.values()]) {
        await confirmar({ id_trabajo: body.id_trabajo, lote: body.lote }, body.resultado, body.detalle);
    }
}

// ---------------------------------------------------------------------
// Impresión
// ---------------------------------------------------------------------
async function procesar(trabajo) {
    const id = trabajo.id_trabajo;
    const c = trabajo.contenido || {};

    if (impresos[id]) {
        log("INFO", `Ticket #${id} ya se había impreso; solo se confirma.`);
        await confirmar(trabajo, "impreso", "ya impreso (confirmación repetida)");
        return;
    }

    let texto;
    try {
        const items = (Array.isArray(c.items) ? c.items : []).slice()
            .sort((a, b) => (a.id_pedido - b.id_pedido) || (a.id_item - b.id_item));
        if (!items.length) throw new Error("ticket sin productos");
        const pedidos = (Array.isArray(c.pedidos) ? c.pedidos : []).slice().sort((a, b) => a - b);
        texto = generarTicket(String(c.mesa_nombre || c.mesa || "Mesa"), items, pedidos);
    } catch (e) {
        log("ERROR", `Ticket #${id}: contenido inválido (${e.message}).`);
        await confirmar(trabajo, "error", `contenido inválido: ${e.message}`);
        return;
    }

    try {
        log("INFO", `Imprimiendo ticket #${id} · ${c.mesa_nombre || c.mesa} · pedidos ${(c.pedidos || []).join(", ")} · intento ${trabajo.intentos}`);
        await printTicket(texto);
    } catch (e) {
        log("ERROR", `Ticket #${id}: falló la impresión (${e.message}). Vuelve a la cola.`);
        await confirmar(trabajo, "error", e.message);
        return;
    }

    marcarImpreso(id); // antes de confirmar: si la confirmación falla no se reimprime
    log("INFO", `Ticket #${id} impreso.`);
    await confirmar(trabajo, "impreso", "ok");
}

async function vuelta() {
    await reintentarConfirmaciones();
    const r = await post("/impresion_v2_reservar", {
        sucursal: cfg.sucursal, dispositivo: cfg.dispositivo, version: cfg.version, max: cfg.maxPorConsulta
    });
    if (r.data.res_status !== "S") throw new Error(r.data.message || "respuesta_invalida");
    const trabajos = (r.data.data && r.data.data.trabajos) || [];
    for (const t of trabajos) await procesar(t);
}

const dormir = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function iniciar() {
    if (!API_KEY) {
        log("ERROR", "Falta IMPRESION_V2_API_KEY en impresion_v2.env. Ver LEEME_IMPRESION_V2.txt.");
        process.exit(1);
    }
    limpiarLogsAntiguos();
    cargarImpresos();
    log("INFO", `🚀 Impresión V2 iniciada (${cfg.version}) · ${cfg.servidor} · sucursal ${cfg.sucursal} · cada ${cfg.intervaloMs / 1000} s`);

    let ultimoError = "";
    // Ciclo sin solapamiento: la siguiente consulta empieza cuando termina la anterior
    for (;;) {
        try {
            await vuelta();
            if (ultimoError) { log("INFO", "Conexión con el servidor restablecida."); ultimoError = ""; }
        } catch (e) {
            const msg = e.response ? `HTTP ${e.response.status} ${(e.response.data && e.response.data.message) || ""}` : e.message;
            if (msg !== ultimoError) log("ERROR", `Error consultando el servidor: ${msg}`); // no repetir el mismo error cada 3 s
            ultimoError = msg;
        }
        await dormir(cfg.intervaloMs);
    }
}

process.on("SIGINT", () => {
    log("INFO", "🛑 Deteniendo servicio...");
    process.exit(0);
});
process.on("unhandledRejection", (e) => log("ERROR", `Promesa no controlada: ${e && e.message}`));

if (require.main === module) iniciar();

module.exports = { procesar, vuelta, _estado: { confirmacionesPendientes, get impresos() { return impresos; } } };
