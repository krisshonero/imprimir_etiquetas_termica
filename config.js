module.exports = {
  printerPath: "\\\\localhost\\POS-80",   // Recurso compartido de Windows
  pollingUrl: "https://cafeteriavelora.cl/cliente_mesas_obtener_imprimir",  // URL a consultar
  pollingInterval: 10000,                  // milisegundos entre consultas
  deviceId: "mi-impresora-01",            // Identificador para la API
  encoding: "GB18030"                     // Codificación para caracteres especiales
};