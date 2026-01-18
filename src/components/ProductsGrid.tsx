import type { Product } from '../types'

type ProductsGridProps = {
  products: Product[]
  onProductClick: (product: Product) => void
  flashingPrices?: Record<string, boolean>
}

export function ProductsGrid({ products, onProductClick, flashingPrices = {} }: ProductsGridProps) {
  return (
    <div className="pos-products-grid">
      {products.map((product) => (
        <button
          key={product.id}
          className="product-button"
          onClick={() => onProductClick(product)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <span>{product.name}</span>
            {flashingPrices[product.id] && (
              <span style={{ fontSize: '11px', color: '#b00020', fontWeight: 'bold', marginTop: '2px' }}>
                ${product.pricePerUnit}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}

