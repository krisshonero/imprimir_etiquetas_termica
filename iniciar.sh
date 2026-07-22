#!/bin/bash

while true; do
    node main.js
    exit_code=$?

    if [ "$exit_code" -eq 0 ]; then
        echo "El servicio terminó correctamente."
        break
    fi

    echo "El servicio falló (código $exit_code). Reiniciando en 5 segundos..."
    sleep 5
done

