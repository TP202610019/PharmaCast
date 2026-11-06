# Actualización automática de PharmaCast

Para la VM Ubuntu existente en `/srv/pharmacast`, con Docker Compose, HTTPS
y los servicios `db`, `ml`, `backend` y `web` ya operativos.

El servidor comprueba las ramas `main` de los tres repositorios públicos un
minuto después de terminar cada comprobación. Revisa también al arrancar.
No usa un runner de GitHub, claves SSH de despliegue ni tokens de GitHub.

## Instalación

Descargar `instalar.sh` desde un commit concreto del repositorio, revisar el
archivo y ejecutarlo con `sudo bash instalar.sh SHA_COMPLETO_DEL_FRONTEND`.
El instalador descarga `actualizar.sh` de ese mismo commit, realiza el primer
despliegue y habilita el temporizador solo si termina correctamente.

La primera ejecución reconstruye los tres servicios. Después solo construye
los repositorios cuyo commit de `main` cambió. Usa copias temporales obtenidas
con `git archive`: conserva las carpetas de código existentes en la VM y sus
cambios locales. No modifica `.env`, Nginx, certificados ni volúmenes.

Antes de actualizar backend crea un `pg_dump -Fc` en `backups/` y ejecuta las
migraciones desde una imagen SDK independiente. Las imágenes de aplicación
solo se sustituyen después de construir y migrar con éxito. Verifica ML, la
ruta protegida del backend y HTTPS antes de guardar los commits desplegados.

## Operación

```bash
sudo systemctl list-timers --all pharmacast-actualizar.timer
sudo journalctl -u pharmacast-actualizar.service -n 100 --no-pager
sudo systemctl start pharmacast-actualizar.service
sudo systemctl stop pharmacast-actualizar.timer
sudo systemctl start pharmacast-actualizar.timer
```

Una VM apagada no se actualiza. Recogerá los commits pendientes cuando arranque.
Un commit local requiere `git push` a `main` para ser detectado. Pueden existir
breves interrupciones al recrear contenedores; no es un despliegue sin cortes.

Si falla una comprobación después del cambio, se intenta recuperar las imágenes
anteriores. Las migraciones de datos no se revierten automáticamente: requieren
compatibilidad con la versión anterior o recuperación manual desde la copia.
No subir secretos a los repositorios: quien puede modificar `main` puede
modificar el código que se construye y ejecuta en producción.

Las copias y las imágenes anteriores se conservan en el disco de la VM. No son
una copia externa ni sustituyen una política de respaldos con retención.
Vigilar `df -h` y `sudo docker system df`; no usar limpieza con volúmenes.
El script instalado no se reemplaza automáticamente cuando cambia `deploy/`:
para actualizar el propio automatismo, repetir la instalación con el nuevo SHA.
