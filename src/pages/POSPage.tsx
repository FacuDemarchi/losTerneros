import { useMemo, useState, useEffect } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { BottomControls } from '../components/BottomControls'
import { CategoryStrip } from '../components/CategoryStrip'
import { ProductsGrid } from '../components/ProductsGrid'
import { TicketPanel } from '../components/TicketPanel'
import { HistoryModal } from '../components/HistoryModal'
import { WeightInputModal } from '../components/WeightInputModal'
import type { TicketItem, Product, ClosedTicket, Category } from '../types'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import '../App.css'

interface POSPageProps {
  categories: Category[]
}

export function POSPage({ categories }: POSPageProps) {
  const navigate = useNavigate()
  const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0]?.id)
  const [ticketItems, setTicketItems] = useLocalStorage<TicketItem[]>('pos-current-ticket', [])
  const [closedTickets, setClosedTickets] = useLocalStorage<ClosedTicket[]>('pos-closed-tickets', [])
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [weighingProduct, setWeighingProduct] = useState<Product | null>(null)

  // Cargar historial de ventas del backend al iniciar
  useEffect(() => {
    api.getSales().then(sales => {
      if (sales && sales.length > 0) {
        // Ordenar por fecha descendente si no vienen ordenadas
        const sortedSales = sales.sort((a, b) => b.timestamp - a.timestamp)
        setClosedTickets(sortedSales)
      }
    })
  }, [])

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) ?? categories[0],
    [selectedCategoryId, categories],
  )

  const grandTotal = useMemo(
    () =>
      ticketItems.reduce(
        (sum, item) => sum + item.quantity * item.pricePerUnit,
        0,
      ),
    [ticketItems],
  )

  const totalQuantity = useMemo(
    () => ticketItems.reduce((sum, item) => sum + item.quantity, 0),
    [ticketItems],
  )

  function handleCategoryClick(categoryId: string) {
    setSelectedCategoryId(categoryId)
  }

  function recalculateSurcharge(items: TicketItem[]): TicketItem[] {
    const surchargeItem = items.find((i) => i.productId === 'tar-10')
    if (!surchargeItem) {
      return items
    }

    const subtotal = items.reduce((sum, item) => {
      if (item.productId === 'tar-10') return sum
      return sum + item.quantity * item.pricePerUnit
    }, 0)

    const surchargeAmount = subtotal * 0.1

    return items.map((item) =>
      item.productId === 'tar-10'
        ? { ...item, pricePerUnit: surchargeAmount, quantity: 1 }
        : item,
    )
  }

  function handleProductClick(product: Product) {
    if (product.unitType === 'weight') {
        setWeighingProduct(product)
        return
    }

    setTicketItems((current) => {
      let nextItems = [...current]
      const existing = nextItems.find((item) => item.productId === product.id)

      if (existing) {
        if (product.id === 'tar-10') {
             return recalculateSurcharge(nextItems)
        }
        nextItems = nextItems.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      } else {
        const nextItem: TicketItem = {
          productId: product.id,
          name: product.name,
          quantity: 1,
          pricePerUnit: product.pricePerUnit,
          unitType: product.unitType,
        }
        nextItems.push(nextItem)
      }

      return recalculateSurcharge(nextItems)
    })
  }

  function handleWeightConfirm(weight: number) {
      if (!weighingProduct) return

      setTicketItems((current) => {
        let nextItems = [...current]
        const existing = nextItems.find((item) => item.productId === weighingProduct.id)

        if (existing) {
             nextItems = nextItems.map((item) =>
              item.productId === weighingProduct.id
                ? { ...item, quantity: item.quantity + weight }
                : item,
            )
        } else {
            const nextItem: TicketItem = {
                productId: weighingProduct.id,
                name: weighingProduct.name,
                quantity: weight,
                pricePerUnit: weighingProduct.pricePerUnit,
                unitType: weighingProduct.unitType,
              }
              nextItems.push(nextItem)
        }
        
        return recalculateSurcharge(nextItems)
      })
      setWeighingProduct(null)
  }

  function handleQuantityChange(productId: string, value: string) {
    const numeric = Number(value.replace(',', '.'))
    if (Number.isNaN(numeric)) {
      return
    }

    setTicketItems((current) => {
      const nextItems = current.map((item) => {
        if (item.productId !== productId) {
          return item
        }

        if (numeric < 0) {
          return item
        }

        if (item.unitType === 'unit') {
          const roundedQuantity = Math.round(numeric)
          return { ...item, quantity: roundedQuantity }
        }

        const scaled = Math.round(numeric * 1000) / 1000
        return { ...item, quantity: scaled }
      })

      return recalculateSurcharge(nextItems)
    })
  }

  function handleCloseTicket(type: 'normal' | 'B' | 'A' = 'normal') {
    if (ticketItems.length === 0) return

    const newTicket: ClosedTicket = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      items: ticketItems,
      total: grandTotal,
      type,
    }

    setClosedTickets((prev) => [newTicket, ...prev])
    setTicketItems([])

    // Guardar venta en backend
    api.saveSale(newTicket)
  }

  function handleRemoveItem(productId: string) {
    setTicketItems((current) => {
      const itemToRemove = current.find(item => item.productId === productId);
      
      if (itemToRemove && itemToRemove.unitType === 'unit' && itemToRemove.quantity > 1) {
          const nextItems = current.map(item => 
              item.productId === productId 
                  ? { ...item, quantity: item.quantity - 1 }
                  : item
          );
          return recalculateSurcharge(nextItems);
      }
      
      const nextItems = current.filter((item) => item.productId !== productId)
      return recalculateSurcharge(nextItems)
    })
  }

  const [flashingPrices, setFlashingPrices] = useState<Record<string, boolean>>({})
  const [isTicketOpen, setIsTicketOpen] = useState(false)

  function handleSelectNormal() {
    const newFlashing: Record<string, boolean> = {}
    categories.forEach(cat => {
        cat.products.forEach(prod => {
            newFlashing[prod.id] = true
        })
    })
    setFlashingPrices(newFlashing)

    setTimeout(() => {
        setFlashingPrices({})
    }, 10000)
  }

  return (
    <div className="pos-root">
      <div className="pos-main">
        <CategoryStrip
          categories={categories}
          selectedCategoryId={selectedCategory?.id}
          onSelectCategory={handleCategoryClick}
          onOpenTicket={() => setIsTicketOpen(true)}
          totalQuantity={totalQuantity}
        />

        <ProductsGrid
          products={selectedCategory?.products ?? []}
          onProductClick={handleProductClick}
          flashingPrices={flashingPrices}
        />

        <BottomControls 
            onCloseTicket={handleCloseTicket} 
            onSelectNormal={handleSelectNormal}
        />
      </div>

      <div className={`pos-side-overlay ${isTicketOpen ? 'visible' : ''}`} onClick={() => setIsTicketOpen(false)} />
      
      <div className={`pos-side-wrapper ${isTicketOpen ? 'open' : ''}`}>
        <TicketPanel
          items={ticketItems}
          grandTotal={grandTotal}
          totalQuantity={totalQuantity}
          onQuantityChange={handleQuantityChange}
          onRemoveItem={handleRemoveItem}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onClose={() => setIsTicketOpen(false)}
        />
      </div>

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        tickets={closedTickets}
      />

      <WeightInputModal
        isOpen={!!weighingProduct}
        onClose={() => setWeighingProduct(null)}
        onConfirm={handleWeightConfirm}
        productName={weighingProduct?.name ?? ''}
      />
    </div>
  )
}
