import type { Category, ClosedTicket } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// Headers base para todas las peticiones
// 'bypass-tunnel-reminder' es necesario para que Localtunnel no bloquee la petición con su página de aviso
const BASE_HEADERS = {
    'Content-Type': 'application/json',
    'bypass-tunnel-reminder': 'true',
}

// Función helper para reportar errores a la UI
function reportError(context: string, error: any) {
    console.error(context, error);
    const msg = error instanceof Error ? error.message : String(error);
    // Disparar evento global para que DebugConsole lo capture
    window.dispatchEvent(new CustomEvent('app-error', { 
        detail: `[${new Date().toLocaleTimeString()}] ${context}: ${msg}` 
    }));
}

export const api = {
  // Configuration
  async getConfig(): Promise<{ categories: Category[] } | null> {
    try {
      const response = await fetch(`${API_URL}/config`, {
          headers: BASE_HEADERS
      })
      
      // Intentar leer el texto primero por si falla el JSON (ej: HTML de error)
      const text = await response.text();
      
      try {
          const data = JSON.parse(text);
          if (!response.ok) throw new Error(data.error || 'Failed to fetch config');
          return data;
      } catch (e) {
          throw new Error(`Respuesta inválida del servidor: ${text.substring(0, 50)}...`);
      }
    } catch (error) {
      console.warn('Offline mode: Could not fetch config', error)
      return null
    }
  },

  async saveConfig(categories: Category[]): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/config`, {
        method: 'POST',
        headers: BASE_HEADERS,
        body: JSON.stringify({ categories }),
      })
      return response.ok
    } catch (error) {
      reportError('Error saving config', error)
      return false
    }
  },

  // Sales
  async getSales(): Promise<ClosedTicket[]> {
    try {
      const response = await fetch(`${API_URL}/sales`, {
          headers: BASE_HEADERS
      })
      const text = await response.text();
      try {
          const data = JSON.parse(text);
          if (!response.ok) throw new Error('Failed to fetch sales');
          return data;
      } catch (e) {
          throw new Error(`Respuesta inválida (Sales): ${text.substring(0, 50)}...`);
      }
    } catch (error) {
      console.warn('Offline mode: Could not fetch sales', error)
      return []
    }
  },

  async saveSale(ticket: ClosedTicket): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/sales`, {
        method: 'POST',
        headers: BASE_HEADERS,
        body: JSON.stringify(ticket),
      })
      return response.ok
    } catch (error) {
      console.warn('Offline mode: Could not save sale to backend (saved locally)', error)
      return false
    }
  },

  async syncTickets(targetUrl: string, tickets: ClosedTicket[]): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: BASE_HEADERS,
        body: JSON.stringify({ tickets }),
      })
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch(e) {
        throw new Error(`Error de sincronización (HTML response): ${text.substring(0, 100)}`);
      }

      if (!response.ok) throw new Error(data.error || 'Sync failed')
      return { success: true, message: `Sincronización exitosa: ${data.added} tickets nuevos agregados.` }
    } catch (error: any) {
      reportError('Error syncing tickets', error)
      return { success: false, message: error.message || 'Error de conexión' }
    }
  }
}
