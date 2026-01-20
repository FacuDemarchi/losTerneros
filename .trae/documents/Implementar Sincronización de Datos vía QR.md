Entendido perfectamente. El flujo es: **PC Local (Receptor) muestra QR** <- **Celular (Vercel) escanea y envía**.

Además, modificaremos la interfaz del historial para integrar el botón de escaneo ahí mismo.

### Plan de Implementación

## 1. Instalación de Dependencias
- `react-qr-code`: Para la PC local (generar QR).
- `@yudiel/react-qr-scanner`: Para el celular (leer QR).

## 2. Backend (Local)
- Crear endpoint `POST /api/sync` en `backend/index.js`.
- Lógica: Recibir array de tickets y guardarlos en la base de datos `pos.db`, evitando duplicados.

## 3. Frontend - ConfigPage (PC Local)
- Agregar sección "Modo Receptor".
- Mostrar el código QR con la URL de la API local (ej: `http://TU_IP:3001/api/sync`).
- Este QR solo es útil verlo en la PC que actuará como servidor.

## 4. Frontend - HistoryModal (Celular)
- **Modificar UI**:
    - Reducir tamaño de botones de filtro "A" y "B".
    - Agregar botón con icono de cámara (QR).
- **Funcionalidad de Escaneo**:
    - Al tocar la cámara, abrir modal de escaneo.
    - Al leer el QR (que contiene la URL del servidor local), enviar los tickets cerrados (`closedTickets`) a esa dirección.
    - Mostrar notificación de éxito/error.

## 5. Servicio API
- Agregar función `syncTickets(targetUrl, tickets)` que haga el `fetch` POST a la URL escaneada.