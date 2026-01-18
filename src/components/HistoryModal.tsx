import { useState } from 'react'
import type { ClosedTicket } from '../types'

type HistoryModalProps = {
  isOpen: boolean
  onClose: () => void
  tickets: ClosedTicket[]
}

function formatMoney(value: number) {
  return value.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function HistoryModal({ isOpen, onClose, tickets }: HistoryModalProps) {
  const [filterB, setFilterB] = useState(false)

  if (!isOpen) return null

  const displayedTickets = filterB
    ? tickets.filter((t) => t.type === 'B')
    : tickets

  const totalDay = displayedTickets.reduce((sum, t) => sum + t.total, 0)

  return (
    <div className="history-modal-overlay" onClick={onClose}>
      <div className="history-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="history-header">
          <h2>Tickets Cerrados</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="close-history-button"
              style={{ backgroundColor: filterB ? '#ffee58' : '#fff' }}
              onClick={() => setFilterB(!filterB)}
            >
              Solo B
            </button>
            <button className="close-history-button" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
        <div className="history-list">
          {displayedTickets.length === 0 ? (
            <div className="history-empty">No hay tickets cerrados</div>
          ) : (
            displayedTickets.map((ticket) => (
              <div key={ticket.id} className="history-item">
                <div className="history-item-header">
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="history-time">{formatDate(ticket.timestamp)}</span>
                    {ticket.type === 'B' && (
                      <span style={{ fontSize: '10px', color: '#b00020', fontWeight: 'bold' }}>TIQUET B</span>
                    )}
                  </div>
                  <span className="history-total">${formatMoney(ticket.total)}</span>
                </div>
                <div className="history-item-details">
                  {ticket.items.map((item, idx) => (
                    <div key={idx} className="history-detail-row">
                      <span>{item.name}</span>
                      <span>
                        {item.quantity.toFixed(item.unitType === 'weight' ? 3 : 0)} x{' '}
                        {formatMoney(item.pricePerUnit)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
        <div style={{ padding: '10px', backgroundColor: '#eee', borderTop: '2px solid #999', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
            <span>Total del Día:</span>
            <span>${formatMoney(totalDay)}</span>
        </div>
      </div>
    </div>
  )
}
