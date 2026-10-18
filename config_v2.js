// =====================================================================
// config_v2.js -- configuración de la impresión de tickets V2 (main_v2.js)
// Sin datos secretos: la clave de acceso va en impresion_v2.env (no se
// sube a git). La impresora se sigue tomando de config.js (printer.js).
// =====================================================================
module.exports = {
  servidor: "https://cafeteriavelora.cl",  // base de las rutas /impresion_v2_*
  sucursal: "velora",
  dispositivo: "pc-velora-caja",            // identifica este PC en el servidor
  version: "v2.0.0",
  intervaloMs: 3000,                        // espera entre consultas (sin solaparse)
  maxPorConsulta: 5,                        // trabajos que se reservan por consulta
  timeoutMs: 10000,                         // timeout de cada llamada al servidor
  diasLog: 30                               // días que se guardan los logs
};
