#!/bin/bash

# Script para levantar el servidor de Vax-Ninja
# Asegúrate de tener Docker Desktop abierto antes de correr esto.

echo "🚀 Levantando el servidor de Vax-Ninja..."

# Navegar al directorio del proyecto (si no estamos ahí)
cd "$(dirname "$0")"

# Levantar los contenedores
docker compose up -d --build

echo "✅ Servidor levantado correctamente."
echo "🔗 Frontend: http://localhost:9090"
echo "🔗 Backend: http://localhost:9091"
