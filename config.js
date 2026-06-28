module.exports = {
  printerPath: "\\\\localhost\\POS-80",   // Recurso compartido de Windows
  cliente_mesas_imprimir_obtener: "https://cafeteriavelora.cl/cliente_mesas_imprimir_obtener",  // URL a consultar
  cliente_mesas_ticket_obtener: "https://cafeteriavelora.cl/cliente_mesas_ticket_obtener",  // URL a consultar
  pollingInterval: 3000,                  // milisegundos entre consultas
  deviceId: "mi-impresora-01",            // Identificador para la API
  encoding: "UTF-8"                     // Codificación para caracteres especiales
};