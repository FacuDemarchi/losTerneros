import type { Category, ClosedTicket, Store, Client } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
console.log('API_URL en uso:', API_URL); // Debugging


// Headers base para todas las peticiones
// 'bypass-tunnel-reminder' es necesario para que Localtunnel no bloquee la petición con su página de aviso
const BASE_HEADERS = {
    'Content-Type': 'application/json',
    'bypass-tunnel-reminder': 'true',
}

function getAuthHeaders() {
    const token = localStorage.getItem('pos-token');
    return {
        ...BASE_HEADERS,
        ...(token ? { 'Authorization': token } : {})
    };
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
  // Auth
  async login(password: string, username?: string): Promise<{ success: boolean; role?: 'admin' | 'master' | 'cashier'; error?: string; token?: string; userId?: string; username?: string; permissions?: any }> {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: BASE_HEADERS,
        body: JSON.stringify({ password, username }),
      });
      const data = await response.json();
      if (!response.ok) return { success: false, error: data.error || 'Login failed' };
      return data;
    } catch (error: any) {
      reportError('Error logging in', error);
      return { success: false, error: 'Connection error' };
    }
  },

  // Users
  async getUsers(): Promise<any[]> {
    try {
      const response = await fetch(`${API_URL}/users`, { headers: getAuthHeaders() });
      const text = await response.text();
      if (!response.ok) throw new Error('Failed to fetch users');
      return JSON.parse(text);
    } catch (error) {
      reportError('Error fetching users', error);
      return [];
    }
  },

  async saveUser(user: any): Promise<{ success: boolean; error?: string }> {
    try {
      const method = user.id ? 'PUT' : 'POST';
      const url = user.id ? `${API_URL}/users/${user.id}` : `${API_URL}/users`;
      
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(user),
      });
      const data = await response.json();
      if (!response.ok) return { success: false, error: data.error };
      return { success: true };
    } catch (error) {
      reportError('Error saving user', error);
      return { success: false, error: 'Connection error' };
    }
  },

  async deleteUser(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return response.ok;
    } catch (error) {
      reportError('Error deleting user', error);
      return false;
    }
  },

  // Stores
  async getStores(): Promise<Store[]> {
    try {
      console.log('Fetching stores from:', `${API_URL}/stores`);
      const response = await fetch(`${API_URL}/stores`, { headers: getAuthHeaders() });
      
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`Failed to fetch stores: ${response.status} ${response.statusText} - ${text.substring(0, 100)}`);
      }
      
      return JSON.parse(text);
    } catch (error) {
      reportError('Error fetching stores', error);
      return [];
    }
  },

  async saveStore(store: Store): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/stores`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(store),
      });
      return response.ok;
    } catch (error) {
      reportError('Error saving store', error);
      return false;
    }
  },

  async deleteStore(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/stores/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return response.ok;
    } catch (error) {
      reportError('Error deleting store', error);
      return false;
    }
  },

  // Configuration
  async getConfig(storeId?: string, userId?: string): Promise<{ categories: Category[] } | null> {
    try {
      let url = `${API_URL}/config`;
      const params = new URLSearchParams();
      if (storeId) params.append('storeId', storeId);
      if (userId) params.append('userId', userId);
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;

      const response = await fetch(url, {
          headers: getAuthHeaders()
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

  async saveConfig(categories: Category[], storeId?: string, userId?: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/config`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ categories, storeId, userId }),
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
      // Preparar tickets para sincronización: usar externalId como productId si existe
      const ticketsToSync = tickets.map(ticket => ({
        ...ticket,
        items: ticket.items.map(item => ({
          ...item,
          productId: item.externalId || item.productId
        }))
      }))

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: BASE_HEADERS,
        body: JSON.stringify({ tickets: ticketsToSync }),
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
  },

  // Clients
  async searchClients(query: string = ''): Promise<Client[]> {
    try {
      const response = await fetch(`${API_URL}/clients?q=${encodeURIComponent(query)}`, {
        headers: BASE_HEADERS
      });
      
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        if (!response.ok) throw new Error(data.error || 'Failed to fetch clients');
        return data;
      } catch (e) {
         throw new Error(`Respuesta inválida (Clients): ${text.substring(0, 50)}...`);
      }
    } catch (error) {
      reportError('Error searching clients', error);
      return [];
    }
  },

  async saveClient(client: { name: string, cuit: string }): Promise<Client | null> {
    try {
      const response = await fetch(`${API_URL}/clients`, {
        method: 'POST',
        headers: BASE_HEADERS,
        body: JSON.stringify(client),
      });

      const text = await response.text();
      try {
         const data = JSON.parse(text);
         if (!response.ok) throw new Error(data.error || 'Failed to save client');
         return data;
      } catch (e) {
          throw new Error(`Respuesta inválida (Save Client): ${text.substring(0, 50)}...`);
      }
    } catch (error) {
      reportError('Error saving client', error);
      return null;
    }
  }
}
