import { useState, useMemo } from 'react'
import type { Client } from '../types'
import { DebouncedInput } from './DebouncedInput'

interface ClientSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (client: Client) => void
  clients: Client[]
}

export function ClientSelectionModal({ isOpen, onClose, onSelect, clients }: ClientSelectionModalProps) {
  const [search, setSearch] = useState('')

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients
    const lower = search.toLowerCase()
    return clients.filter(c => 
      c.name.toLowerCase().includes(lower) || 
      c.cuit.includes(lower)
    )
  }, [clients, search])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
        <div className="modal-header">
          <h2>Seleccionar Cliente</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body">
            <div style={{ marginBottom: '1rem' }}>
                <DebouncedInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Buscar por nombre o CUIT..."
                    className="search-input"
                    autoFocus
                />
            </div>

            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ccc', borderRadius: '4px' }}>
                {filteredClients.length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
                        No se encontraron clientes
                    </div>
                ) : (
                    filteredClients.map(client => (
                        <div 
                            key={client.id || client.cuit}
                            onClick={() => onSelect(client)}
                            style={{ 
                                padding: '10px', 
                                borderBottom: '1px solid #eee', 
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between'
                            }}
                            className="client-item"
                        >
                            <span style={{ fontWeight: 'bold' }}>{client.name}</span>
                            <span style={{ color: '#666' }}>{client.cuit}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>
    </div>
  )
}
