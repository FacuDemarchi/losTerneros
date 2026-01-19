import type { Category } from '../types'

type CategoryStripProps = {
  categories: Category[]
  selectedCategoryId: string | undefined
  onSelectCategory: (categoryId: string) => void
  onOpenTicket?: () => void
  onSelectNormal?: () => void
  totalQuantity?: number
}

export function CategoryStrip({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onOpenTicket,
  onSelectNormal,
  totalQuantity = 0,
}: CategoryStripProps) {
  return (
    <div className="pos-category-strip">
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
                onClick={onSelectNormal}
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

