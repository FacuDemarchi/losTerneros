import type { Category, ClosedTicket } from '../types'

const API_URL = 'http://localhost:3001/api'

export const api = {
  // Configuration
  async getConfig(): Promise<{ categories: Category[] } | null> {
    try {
      const response = await fetch(`${API_URL}/config`)
      if (!response.ok) throw new Error('Failed to fetch config')
      return await response.json()
    } catch (error) {
      console.error('Error fetching config:', error)
      return null
    }
  },

  async saveConfig(categories: Category[]): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories }),
      })
      return response.ok
    } catch (error) {
      console.error('Error saving config:', error)
      return false
    }
  },

  // Sales
  async getSales(): Promise<ClosedTicket[]> {
    try {
      const response = await fetch(`${API_URL}/sales`)
      if (!response.ok) throw new Error('Failed to fetch sales')
      return await response.json()
    } catch (error) {
      console.error('Error fetching sales:', error)
      return []
    }
  },

  async saveSale(ticket: ClosedTicket): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticket),
      })
      return response.ok
    } catch (error) {
      console.error('Error saving sale:', error)
      return false
    }
  },
}
