#!/bin/bash

# Esperar a que cargue el escritorio
sleep 10

# Iniciar servicio de impresión
cd /home/distrito-urbano/Escritorio/etiquetas/imprimir_etiquetas_termica
./iniciar.sh &

# Abrir web del barista
chromium \
--new-window \
https://cafeteriavelora.cl/admin_login &

sleep 5

# Mover ventana del barista al monitor principal
wmctrl -r "admin_login" -e 0,0,0,1200,900

# Abrir web del autoservicio
chromium \
--new-window \
https://cafeteriavelora.cl/cliente_menu/autoservicio/velora &

sleep 5

# Mover ventana del autoservicio al segundo monitor
wmctrl -r "velora" -e 0,1920,0,1200,900
