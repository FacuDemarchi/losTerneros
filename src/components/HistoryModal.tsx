import { useState, useMemo, useEffect } from 'react'
import type { ClosedTicket } from '../types'
import { QrCode, X, ChevronDown, ChevronRight } from 'lucide-react'
import { Scanner } from '@yudiel/react-qr-scanner'
import { api } from '../services/api'
import { formatMoney, formatDate, formatTime } from '../utils/format'

type HistoryModalProps = {
  isOpen: boolean
  onClose: () => void
  tickets: ClosedTicket[]
}

export function HistoryModal({ isOpen, onClose, tickets }: HistoryModalProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'A' | 'B'>('all')
  const [isScanning, setIsScanning] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (isOpen) {
      const today = formatDate(Date.now())
      setExpandedDates(prev => ({
        ...prev,
        [today]: true
      }))
    }
  }, [isOpen])

  if (!isOpen) return null

  const displayedTickets = tickets.filter((t) => {
    if (filterMode === 'all') return true
    return t.type === filterMode
  })

  const ticketsByDate = useMemo(() => {
    const groups: Record<string, ClosedTicket[]> = {}
    displayedTickets.forEach(ticket => {
      const date = formatDate(ticket.timestamp)
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(ticket)
    })
    return groups
  }, [displayedTickets])

  const sortedDates = useMemo(() => {
    return Object.keys(ticketsByDate).sort((a, b) => {
      const [dayA, monthA, yearA] = a.split('/').map(Number)
      const [dayB, monthB, yearB] = b.split('/').map(Number)
      return new Date(yearB, monthB - 1, dayB).getTime() - new Date(yearA, monthA - 1, dayA).getTime()
    })
  }, [ticketsByDate])

  const totalDay = displayedTickets.reduce((sum, t) => sum + t.total, 0)

  const toggleDate = (date: string) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }))
  }

  const handleScan = async (detectedCodes: any[]) => {
      if (detectedCodes.length > 0) {
          const url = detectedCodes[0].rawValue;
          setIsScanning(false) // Stop scanning
          
          setSyncMessage('Enviando datos a: ' + url)
          try {
            const result = await api.syncTickets(url, tickets)
            setSyncMessage(result.message)
            if(result.success) setTimeout(() => setSyncMessage(''), 3000)
          } catch (e: any) {
             setSyncMessage('Error CRÍTICO: ' + e.toString())
          }
      }
  }

  if (isScanning) {
      return (
          <div className="history-modal-overlay">
              <div className="scanner-container" style={{ background: 'black', width: '100%', height: '100%', position: 'relative' }}>
                  <button 
                    onClick={() => setIsScanning(false)}
                    style={{ position: 'absolute', top: 20, right: 20, zIndex: 1000, background: 'white', border: 'none', borderRadius: '50%', padding: '10px' }}
                  >
                      <X size={24} />
                  </button>
                  <Scanner onScan={handleScan} />
                  <div style={{ position: 'absolute', bottom: 50, left: 0, right: 0, textAlign: 'center', color: 'white' }}>
                      Apunte al QR del Servidor
                  </div>
              </div>
          </div>
      )
  }

  return (
    <div className="history-modal-overlay" onClick={onClose}>
      <div className="history-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="history-header">
          <h2>Tickets Cerrados</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Botón de Sincronización QR */}
            <button 
                className="close-history-button"
                onClick={() => setIsScanning(true)}
                title="Escanear QR para enviar"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}
            >
                <QrCode size={18} />
            </button>

            <button
              className="close-history-button small-btn"
              style={{ backgroundColor: filterMode === 'B' ? '#ffee58' : '#fff' }}
              onClick={() => setFilterMode(filterMode === 'B' ? 'all' : 'B')}
            >
              B
            </button>
            <button
              className="close-history-button small-btn"
              style={{ backgroundColor: filterMode === 'A' ? '#ffee58' : '#fff' }}
              onClick={() => setFilterMode(filterMode === 'A' ? 'all' : 'A')}
            >
              A
            </button>
            <button className="close-history-button" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>
        
        {syncMessage && (
            <div style={{ padding: '8px', backgroundColor: '#e8f5e9', color: '#2e7d32', textAlign: 'center', fontSize: '14px', marginBottom: '5px' }}>
                {syncMessage}
            </div>
        )}

        <div className="history-list">
          {displayedTickets.length === 0 ? (
            <div className="history-empty">No hay tickets cerrados</div>
          ) : (
            sortedDates.map((date) => (
              <div key={date} className="history-date-group">
                <div 
                  className="history-date-header"
                  onClick={() => toggleDate(date)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 10px',
                    backgroundColor: '#f5f5f5',
                    borderBottom: '1px solid #e0e0e0',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    userSelect: 'none'
                  }}
                >
                  <span style={{ fontSize: '14px', color: '#333' }}>{date}</span>
                  {expandedDates[date] ? <ChevronDown size={20} color="#666" /> : <ChevronRight size={20} color="#666" />}
                </div>
                
                {expandedDates[date] && (
                  <div className="history-date-content">
                    {ticketsByDate[date].map((ticket) => (
                      <div key={ticket.id} className="history-item">
                        <div className="history-item-header">
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="history-time">{formatTime(ticket.timestamp)}</span>
                            {ticket.type === 'B' && (
                              <span style={{ fontSize: '10px', color: '#b00020', fontWeight: 'bold' }}>TIQUET B</span>
                            )}
                            {ticket.type === 'A' && (
                              <span style={{ fontSize: '10px', color: '#1976d2', fontWeight: 'bold' }}>TIQUET A</span>
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
                    ))}
                  </div>
                )}
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
