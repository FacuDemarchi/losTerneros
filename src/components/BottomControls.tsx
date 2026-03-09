import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'

type BottomControlsProps = {
  onCloseTicket: (type?: 'normal' | 'B' | 'A') => void
  onSelectNormal: () => void
}

export function BottomControls({ onCloseTicket, onSelectNormal }: BottomControlsProps) {
  const navigate = useNavigate()
  const tapCountRef = useRef(0)
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleSecretTap() {
    // Si hay una acción normal (Mostrar Precios), la ejecutamos
    onSelectNormal()

    // Lógica del gesto secreto
    tapCountRef.current += 1
    
    if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current)
    }

    tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0
    }, 3000) // Resetear si pasan más de 3s entre toques

    if (tapCountRef.current >= 4) {
        tapCountRef.current = 0
        navigate('/config')
    }
  }

  return (
    <div className="pos-bottom-controls">
      <button className="bottom-button bottom-button-large" onClick={() => onCloseTicket('normal')}>
        Cerrar Cliente
      </button>
      <button className="bottom-button bottom-button-large" onClick={() => onCloseTicket('B')}>
        Tiquet B
      </button>
      <button className="bottom-button bottom-button-large" onClick={() => onCloseTicket('A')}>
        Tiquet A
      </button>
      <button className="bottom-button bottom-button-small" onClick={handleSecretTap}>
        Mostrar Precios
      </button>
    </div>
  )
}

