# Los Terneros POS

Sistema de Punto de Venta (POS) diseñado para carnicerías, con capacidad de funcionamiento en múltiples dispositivos, sincronización centralizada y soporte para escaneo de códigos QR.

## Características

*   **Interfaz de Venta Rápida**: Diseñada para pantallas táctiles y uso ágil.
*   **Multi-Dispositivo**: Funciona en PC y dispositivos móviles.
*   **Sincronización en Tiempo Real**:
    *   Los precios se actualizan instantáneamente en todos los dispositivos conectados.
    *   Sincronización de ventas desde móviles al servidor central mediante QR.
*   **Gestión de Ventas**:
    *   Historial de ventas diarias.
    *   Clasificación de tickets (Tipo A, B, Normal).
    *   Exportación de datos.
*   **Visor de Recepción**: Pantalla dedicada para recibir y visualizar ventas entrantes desde otros dispositivos.

## Requisitos Previos

*   [Node.js](https://nodejs.org/) (Versión 18 o superior recomendada)
*   [pnpm](https://pnpm.io/) (Gestor de paquetes)

## Instalación

1.  Clonar el repositorio.
2.  Instalar dependencias en la raíz y en el backend:

```bash
# En la raíz (Frontend)
pnpm install

# En la carpeta backend
cd backend
pnpm install
```

## Ejecución

El sistema consta de dos partes: el **Servidor** (Backend) y la **Aplicación** (Frontend).

### 1. Iniciar el Servidor (Backend)

Este comando levanta el servidor que gestiona la base de datos, los precios y la lógica de negocio.

```bash
pnpm run server
```

### 2. Modo Visor (Receptor QR)

Este comando inicia el servidor y está pensado para la **PC Central**. Muestra una interfaz con un **Código QR** lista para recibir datos.

```bash
pnpm run visor
```

*   **¿Para qué sirve?**: Genera un QR en pantalla que espera ser escaneado por un dispositivo móvil. Al escanearlo, el celular transfiere automáticamente sus ventas a esta PC.
*   **Visor Web**: Abrir `http://localhost:3001/` para ver el QR y monitorear las ventas entrantes en tiempo real.

### 3. Iniciar la Aplicación (Frontend)

Este comando levanta la interfaz de usuario para vender.

```bash
pnpm run dev
```

*   **Acceso Local**: `http://localhost:5173`
*   **Acceso desde Móvil**: Usar la IP de red local (ej: `http://192.168.1.X:5173`).

## Uso del Sistema

### Configuración de Precios
1.  Ir al botón de engranaje (Configuración) en la app.
2.  Modificar los precios o nombres de productos.
3.  Los cambios se guardan automáticamente y se propagan a todos los dispositivos conectados al servidor.

### Sincronización de Ventas (Móvil -> PC)
1.  En la PC Servidor: Abrir el **Visor** (`pnpm run server` y abrir la URL indicada).
2.  En el Celular:
    *   Ir al historial de ventas (icono de reloj).
    *   Tocar el icono de **Código QR**.
    *   Escanear el QR que aparece en la pantalla de la PC.
3.  Las ventas se transferirán y aparecerán en la pantalla de la PC.

## Estructura del Proyecto

*   `/src`: Código fuente del Frontend (React + Vite).
*   `/backend`: Código fuente del Servidor (Express + SQLite + Socket.io).
*   `/backend/public`: Archivos estáticos del Visor Web.
