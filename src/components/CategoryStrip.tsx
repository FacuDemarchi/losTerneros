import { useRef } from 'react'
import type { Category } from '../types'
import { useNavigate } from 'react-router-dom'

type CategoryStripProps = {
  categories: Category[]
  selectedCategoryId: string | undefined
  onSelectCategory: (categoryId: string) => void
  onOpenTicket?: () => void
  onSelectNormal?: () => void
  totalQuantity?: number
  isOffline?: boolean
}

export function CategoryStrip({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onOpenTicket,
  onSelectNormal,
  totalQuantity = 0,
  isOffline = false,
}: CategoryStripProps) {
  const navigate = useNavigate()
  const tapCountRef = useRef(0)
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleSecretTap() {
    // Si hay una acción normal (Mostrar Precios), la ejecutamos
    onSelectNormal?.()

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
    <div className="pos-category-strip">
      {isOffline && (
        <div className="offline-badge">
          ⚠️ MODO OFFLINE (Precios no verificados)
        </div>
      )}
      <div className="pos-category-buttons">
        {categories.map((category) => (
          <button
            key={category.id}
            className={
              category.id === selectedCategoryId
                ? 'category-button category-button-active'
                : 'category-button'
            }
            onClick={() => onSelectCategory(category.id)}
          >
            {category.label}
          </button>
        ))}
      </div>
      
      <div className="mobile-floating-controls">
        {onSelectNormal && (
             <button 
                className="mobile-show-prices-btn"
                onClick={handleSecretTap}
            >
                Mostrar Precios
            </button>
        )}
        {onOpenTicket && (
            <button 
                className="mobile-ticket-toggle"
                onClick={onOpenTicket}
            >
                Ver Ticket ({totalQuantity.toFixed(0)})
            </button>
        )}
      </div>
    </div>
  )
}


