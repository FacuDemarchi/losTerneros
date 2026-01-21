¡Exacto! Esa es la mejor estrategia. Como la sincronización es un evento puntual (escanear y enviar), podemos levantar el túnel solo cuando arrancas el visor.

Implementaremos la automatización completa con **Ngrok** para que sea "sin manos".

### Plan de Ejecución

## 1. Instalar dependencia `ngrok`
En la carpeta `backend`, instalaremos el paquete oficial: `npm install ngrok`.

## 2. Crear `backend/visor-launcher.js`
Este será el nuevo punto de entrada para el comando `visor`.
*   **Paso 1**: Arranca el servidor Express (importando `index.js` como módulo o ejecutándolo).
*   **Paso 2**: Inicia el túnel Ngrok apuntando al puerto 3001.
*   **Paso 3**: Obtiene la URL pública (`https://...`).
*   **Paso 4**: Inyecta esa URL en el servidor para que el QR generado en `/viewer.html` apunte a esa dirección HTTPS segura.

## 3. Modificar `backend/index.js`
Necesitamos hacer un pequeño cambio para que `index.js` permita que le "inyecten" la URL pública desde fuera, o que lea una variable global que el launcher define.
*   Agregaremos una variable `global.PUBLIC_URL` o un método `setPublicUrl()` que el launcher usará.
*   El endpoint `/api/config` devolverá esta URL pública si existe, para que el frontend pinte el QR correcto.

## 4. Actualizar `package.json`
Cambiaremos el script `"visor"` para que ejecute `node visor-launcher.js` en lugar de `nodemon index.js`.

### Resultado Final
Tú escribes: `pnpm run visor`
El sistema responde:
1.  Levanta servidor local.
2.  Levanta Ngrok.
3.  Te muestra en pantalla: **"Modo Público Activo: https://xyz.ngrok.app"**.
4.  Abres el navegador y el QR ya tiene esa dirección HTTPS lista para que tu celular la lea sin errores.