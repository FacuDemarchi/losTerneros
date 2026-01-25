import { useEffect, useState, useRef } from 'react'
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
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const categoriesRef = useRef(categories)

  // Keep ref updated for socket callbacks
  useEffect(() => { categoriesRef.current = categories }, [categories])

  // Cargar configuración inicial del backend y escuchar cambios
  useEffect(() => {
    let isMounted = true;
    const socket = io(API_URL.replace('/api', ''));

    // 1. Initial Fetch
    api.getConfig().then((config) => {
      if (!isMounted) return;

      if (config) {
        console.log('Config loaded from backend');
        if (config.categories && config.categories.length > 0) {
            setCategories(config.categories);
        }
        setStatus('ready');
      } else {
        // Fetch failed. Check if we are Master.
        const role = localStorage.getItem('pos-role');
        if (role === 'master') {
            console.log('Backend down, but I am Master. Using local data.');
            setStatus('ready');
        } else {
            console.warn('Backend unavailable and not Master.');
            // Wait a bit to see if socket connects or master responds
            setTimeout(() => {
                if (isMounted) setStatus(s => s === 'loading' ? 'error' : s);
            }, 3000);
        }
      }
    });

    // 2. Socket Logic
    socket.on('connect', () => {
      console.log('Conectado al servidor de precios');
      // Trigger Sync: Ask if there is a Master
      socket.emit('sync:request_master');
    });

    socket.on('config_updated', (newCategories: Category[]) => {
      console.log('⚠️ Precios actualizados desde el servidor!');
      setCategories(newCategories);
      setStatus('ready');
    });

    // Listen for requests (Only if I am Master)
    socket.on('sync:ask_master', () => {
        const role = localStorage.getItem('pos-role');
        if (role === 'master') {
            console.log('📢 Soy Maestro: Enviando configuración a la red...');
            socket.emit('sync:master_upload', { categories: categoriesRef.current });
        }
    });

    return () => {
      isMounted = false;
      socket.disconnect();
    }
  }, [])

  function handleUpdateCategory(updatedCategory: Category) {
    const newCategories = categories.map(c => c.id === updatedCategory.id ? updatedCategory : c)
    setCategories(newCategories)
    // Sincronizar con backend (Push en tiempo real)
    api.saveConfig(newCategories)
  }

  if (status === 'loading') {
      return <div className="loading-screen"><h1>Cargando Sistema...</h1></div>
  }

  if (status === 'error') {
      return (
          <div className="error-screen">
              <h1>Sistema No Disponible</h1>
              <p>No se puede conectar con el Servidor ni se detectó al Maestro.</p>
              <button onClick={() => window.location.reload()}>Reintentar</button>
          </div>
      )
  }

  return (
    <>
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
      {/* <DebugConsole /> */}
    </>
  )
}

export default App
