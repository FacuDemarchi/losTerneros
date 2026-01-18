import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useLocalStorage } from './hooks/useLocalStorage'
import { POSPage } from './pages/POSPage'
import { ConfigPage } from './pages/ConfigPage'
import { categories as defaultCategories } from './data/products'
import { api } from './services/api'
import type { Category } from './types'
import './App.css'

function App() {
  const [categories, setCategories] = useLocalStorage<Category[]>('pos-categories', defaultCategories)

  // Cargar configuración inicial del backend
  useEffect(() => {
    api.getConfig().then((config) => {
      if (config && config.categories && config.categories.length > 0) {
        // Si hay datos en el backend, usarlos
        console.log('Config loaded from backend')
        setCategories(config.categories)
      } else {
        // Si el backend está vacío (primera vez), inicializarlo con datos locales
        console.log('Backend empty, initializing with local data')
        api.saveConfig(categories)
      }
    })
  }, [])

  function handleUpdateCategory(updatedCategory: Category) {
    const newCategories = categories.map(c => c.id === updatedCategory.id ? updatedCategory : c)
    setCategories(newCategories)
    // Sincronizar con backend
    api.saveConfig(newCategories)
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
