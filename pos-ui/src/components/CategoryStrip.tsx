import type { Category } from '../types'

type CategoryStripProps = {
  categories: Category[]
  selectedCategoryId: string | undefined
  onSelectCategory: (categoryId: string) => void
}

export function CategoryStrip({
  categories,
  selectedCategoryId,
  onSelectCategory,
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
    </div>
  )
}

