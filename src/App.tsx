import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useLocalStorage } from './hooks/useLocalStorage'
import { POSPage } from './pages/POSPage'
import { ConfigPage } from './pages/ConfigPage'
import { categories as defaultCategories } from './data/products'
import { api } from './services/api'
import { io } from 'socket.io-client'
import type { Category } from './types'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function App() {
  const [categories, setCategories] = useLocalStorage<Category[]>('pos-categories', defaultCategories)

  // Cargar configuración inicial del backend y escuchar cambios
  useEffect(() => {
    // 1. Carga inicial
    api.getConfig().then((config) => {
      if (config && config.categories && config.categories.length > 0) {
        console.log('Config loaded from backend')
        setCategories(config.categories)
      } else {
        console.log('Backend empty, initializing with local data')
        api.saveConfig(categories)
      }
    })

    // 2. Conexión Socket.io para actualizaciones en tiempo real
    const socket = io(API_URL.replace('/api', '')) // Ajustar URL si es necesario (quitar /api si está presente)

    socket.on('connect', () => {
      console.log('Conectado al servidor de precios')
    })

    socket.on('config_updated', (newCategories: Category[]) => {
      console.log('⚠️ Precios actualizados desde el servidor!')
      setCategories(newCategories)
    })

    return () => {
      socket.disconnect()
    }
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
