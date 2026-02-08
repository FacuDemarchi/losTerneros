import type { TicketItem, Client } from '../types'
import { useState } from 'react'
import { ClientSelectionModal } from './ClientSelectionModal'
import { Trash2 } from 'lucide-react'

type TicketPanelProps = {
  items: TicketItem[]
  grandTotal: number
  totalQuantity: number
  onQuantityChange: (productId: string, value: string) => void
  onRemoveItem: (productId: string) => void
  onOpenHistory: () => void
  onClose?: () => void
  onCloseTicket?: (type?: 'normal' | 'B' | 'A', client?: Client) => void
  onSelectNormal?: () => void
  onClearTicket?: () => void
  clients?: Client[]
}


function formatMoney(value: number) {
  return value.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatQuantity(item: TicketItem) {
  if (item.unitType === 'unit') {
    return item.quantity.toFixed(0)
  }

  return item.quantity.toFixed(3)
}

/*
function getQuantityStep(item: TicketItem) {
  if (item.unitType === 'unit') {
    return 1
  }

  return 0.001
}
*/

export function TicketPanel({
  items,
  grandTotal,
  totalQuantity,
  // onQuantityChange,
  onRemoveItem,
  onOpenHistory,
  onClose,
  onCloseTicket,
  // onSelectNormal,
  onClearTicket,
  clients = []
}: TicketPanelProps) {
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)

  function handleTicketA() {
      setIsClientModalOpen(true)
  }

  function handleClientSelect(client: Client) {
      setIsClientModalOpen(false)
      if (onCloseTicket) {
          onCloseTicket('A', client)
      }
  }

  return (
    <div className="pos-side">
      <ClientSelectionModal 
        isOpen={isClientModalOpen} 
        onClose={() => setIsClientModalOpen(false)} 
        onSelect={handleClientSelect}
        clients={clients} 
      />
      <div className="pos-total-panel">
        <div className="pos-total-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Monto</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {onClearTicket && items.length > 0 && (
                <button 
                    className="ticket-clear-button" 
                    onClick={() => {
                        if(window.confirm('¿Estás seguro de vaciar el ticket?')) {
                            onClearTicket()
                        }
                    }}
                    title="Vaciar ticket"
                >
                    <Trash2 size={16} />
                </button>
            )}
            <button className="history-toggle-button" onClick={onOpenHistory}>
                Ver Historial
            </button>
            {onClose && (
                <button className="ticket-close-button" onClick={onClose}>
                ✕
                </button>
            )}
          </div>
        </div>
        <div className="pos-total-value">{formatMoney(grandTotal)}</div>
      </div>

      <div className="pos-ticket">
        <div className="ticket-header">
          <div className="ticket-header-cell">Descripción</div>
          <div className="ticket-header-cell">Kg/Uni</div>
          <div className="ticket-header-cell">Precio</div>
          <div className="ticket-header-cell">Monto</div>
        </div>
        <div className="ticket-body">
          {items.map((item) => {
            const rowTotal = item.quantity * item.pricePerUnit

            return (
              <div className="ticket-row" key={item.productId}>
                <div
                  className="ticket-cell ticket-cell-description"
                  onClick={() => onRemoveItem(item.productId)}
                  style={{ cursor: 'pointer' }}
                  title="Clic para quitar ítem"
                >
                  {item.name}
                </div>
                <div className="ticket-cell">
                  {formatQuantity(item)}
                </div>
                <div className="ticket-cell ticket-cell-right">
                  {formatMoney(item.pricePerUnit)}
                </div>
                <div className="ticket-cell ticket-cell-right">
                  {formatMoney(rowTotal)}
                </div>
              </div>
            )
          })}
          {items.length === 0 && (
            <div className="ticket-empty">Sin ítems en el ticket</div>
          )}
        </div>
        <div className="ticket-footer">
          <div className="ticket-footer-label">Total Kg/Uni</div>
          <div className="ticket-footer-value">
            {totalQuantity.toFixed(3)}
          </div>
        </div>
      </div>
      
      {/* Botones móviles para cerrar ticket */}
      <div className="mobile-ticket-actions">
        <div className="mobile-ticket-row">
            <button className="mobile-action-btn btn-close-client" onClick={() => onCloseTicket && onCloseTicket('normal')}>
                Cerrar Cliente
            </button>
        </div>
        <div className="mobile-ticket-row">
            <button className="mobile-action-btn btn-ticket-b" onClick={() => onCloseTicket && onCloseTicket('B')}>
                Tiquet B
            </button>
            <button className="mobile-action-btn btn-ticket-a" onClick={handleTicketA}>
                Tiquet A
            </button>
        </div>
      </div>
    </div>
  )
}

