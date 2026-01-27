# Los Terneros POS 🥩

Sistema de Punto de Venta moderno para carnicerías, diseñado para funcionar con o sin internet y sincronizar ventas entre dispositivos.

## 🚀 Inicio Rápido

### 1. Iniciar el Servidor (Backend)
Es el cerebro del sistema. Debe estar encendido en la PC principal.
```bash
pnpm run server
```

### 2. Iniciar la Pantalla de Ventas (Frontend)
La interfaz para vender.
```bash
pnpm run dev
```
> Accede en: `http://localhost:5173`

---

## 📱 Sincronización Móvil (Modo Visor)

Si usas el sistema en celulares, puedes enviar las ventas a la PC principal al final del día.

1.  **En la PC**: Ejecuta el modo visor para esperar datos.
    ```bash
    pnpm run visor
    ```
    *Se abrirá una pantalla con un código QR.*

2.  **En el Celular**:
    *   Ve al **Historial**.
    *   Toca el botón **QR**.
    *   Escanea la pantalla de la PC.

---

## 🛠️ Administración y Seguridad

### Cambiar Contraseñas
El sistema usa claves para proteger configuraciones críticas. Puedes cambiarlas fácilmente desde la terminal:

```bash
# Cambiar clave Maestra (Acceso total)
npm run set-auth master "nueva_clave"

# Cambiar clave Admin (Solo configuración)
npm run set-auth admin "nueva_clave"
```
> **Importante**: Reinicia el servidor (`pnpm run server`) después de cambiar una clave.

---

## 📦 Instalación (Solo primera vez)

Si acabas de descargar el proyecto:

1.  Instalar dependencias generales:
    ```bash
    pnpm install
    ```
2.  Instalar dependencias del servidor:
    ```bash
    cd backend
    pnpm install
    ```

---

## 📂 Estructura Técnica

*   **Frontend (`/src`)**: Interfaz hecha con React + Vite.
*   **Backend (`/backend`)**: Servidor Node.js + Express.
*   **Base de Datos**: PostgreSQL (Neon DB).

## ☁️ Despliegue en la Nube (Render)

Para independizarte de la PC local, puedes subir el backend a Render.com (Gratis).

1.  Crea una cuenta en [Render.com](https://render.com).
2.  Conecta tu repositorio de GitHub.
3.  Ve a **Blueprints** y selecciona "New Blueprint Instance".
4.  Render detectará automáticamente el archivo `render.yaml`.
5.  Te pedirá las siguientes variables de entorno (copialas de tu `.env` local):
    *   `DATABASE_URL`: La conexión a Neon.
    *   `MASTER_HASH`: Tu clave maestra encriptada.
    *   `ADMIN_HASH`: Tu clave admin encriptada.

¡Listo! Tendrás una URL como `https://los-terneros-backend.onrender.com` que podrás usar en tus celulares.
