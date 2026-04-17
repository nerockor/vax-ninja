# 🎮 Instrucciones para Levantar el Servidor (Vax-Ninja)

Este proyecto utiliza **Docker** para manejar tanto el frontend como el backend. Esto facilita que todo funcione igual en cualquier máquina.

## 🚀 Cómo iniciar el servidor

Si la computadora se apaga o reinicia, sigue estos pasos:

### Opción 1: Usando el script (Más rápido)
1. Abre una terminal.
2. Navega a la carpeta del proyecto.
3. Ejecuta el comando:
   ```bash
   ./start.sh
   ```

### Opción 2: Manualmente con Docker
Si prefieres hacerlo a mano, ejecuta este comando en la carpeta `vax-ninja`:
```bash
docker compose up -d
```

## 🔗 Enlaces Útiles
- **Juego (Frontend):** [http://localhost:9090](http://localhost:9090)
- **API (Backend):** [http://localhost:9091](http://localhost:9091)
- **Documentación API:** [http://localhost:9091/docs](http://localhost:9091/docs)

## 🛠 Solución de Problemas

### "Docker is not running"
Asegúrate de que la aplicación **Docker Desktop** esté abierta en tu Mac. Sin Docker abierto, el servidor no puede arrancar.

### "Puerto ya está en uso"
Si recibes un error diciendo que el puerto 9090 o 9091 está ocupado, intenta cerrar otras aplicaciones que puedan estar usándolos o reinicia los contenedores con:
```bash
docker compose down
docker compose up -d
```

### Ver logs
Si algo no funciona, puedes ver que está pasando en "tiempo real" con:
```bash
docker compose logs -f
```
