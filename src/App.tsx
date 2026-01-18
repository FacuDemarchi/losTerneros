import { Routes, Route } from 'react-router-dom'
import { useLocalStorage } from './hooks/useLocalStorage'
import { POSPage } from './pages/POSPage'
import { ConfigPage } from './pages/ConfigPage'
import { categories as defaultCategories } from './data/products'
import type { Category } from './types'
import './App.css'

function App() {
  const [categories, setCategories] = useLocalStorage<Category[]>('pos-categories', defaultCategories)

  function handleUpdateCategory(updatedCategory: Category) {
    setCategories((current) => 
      current.map(c => c.id === updatedCategory.id ? updatedCategory : c)
    )
  }

  return (
    <Routes>
      <Route path="/" element={<POSPage categories={categories} />} />
      <Route 
        path="/config" 
        element={
          <ConfigPage 
            categories={categories} 
            onUpdateCategory={handleUpdateCategory} 
          />
        } 
      />
    </Routes>
  )
}

export default App
