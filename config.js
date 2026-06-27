module.exports = {
  printerPath: "\\\\localhost\\POS-80",   // Recurso compartido de Windows
  pollingUrl: "https://cafeteriavelora.cl/cliente_mesas_imprimir_obtener",  // URL a consultar
  pollingInterval: 3000,                  // milisegundos entre consultas
  deviceId: "mi-impresora-01",            // Identificador para la API
  encoding: "UTF-8"                     // Codificación para caracteres especiales
};