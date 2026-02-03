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
  // Iniciamos siempre en 'loading' para garantizar sincronización
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'offline'>('loading')
  const categoriesRef = useRef(categories)

  // Keep ref updated for socket callbacks
  useEffect(() => { categoriesRef.current = categories }, [categories])

  // Cargar configuración inicial del backend y escuchar cambios
  useEffect(() => {
    let isMounted = true;
    
    // Si API_URL termina en /api, lo quitamos para conectar al socket (que suele estar en la raíz)
    const socketUrl = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;
    console.log('🔌 Conectando Socket.io a:', socketUrl);
    
    const socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        withCredentials: true
    });

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
        // Fetch failed (server down or internet issues)
        console.warn('Backend fetch failed. Checking for offline availability...');
        
        // Si tenemos datos locales, ofrecemos modo offline
        if (categoriesRef.current && categoriesRef.current.length > 0) {
            setStatus('offline');
        } else {
            // Si no hay nada de nada, es un error fatal
            setStatus('error');
        }
      }
    });

    // 2. Socket Logic
    socket.on('connect', () => {
      console.log('Conectado al servidor de precios');
      // Trigger Sync: Ask if there is a Master
      socket.emit('sync:request_master');
    });

    socket.on('config_updated', (data: any) => {
      console.log('⚠️ Configuración recibida:', data);
      
      // Manejar tanto el formato viejo (Category[]) como el nuevo ({categories, storeId})
      const newCategories = Array.isArray(data) ? data : data.categories;
      const incomingStoreId = Array.isArray(data) ? undefined : data.storeId;
      
      const currentStoreId = localStorage.getItem('selected-store-id');
      
      // Actualizar si es una actualización global o si coincide con el local seleccionado
      if (!incomingStoreId || incomingStoreId === currentStoreId) {
        console.log('⚠️ Precios actualizados!');
        setCategories(newCategories);
        setStatus('ready');
      }
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
    // Sincronizar con backend (usando storeId si existe en localStorage)
    const storeId = localStorage.getItem('selected-store-id')
    api.saveConfig(newCategories, storeId || undefined)
  }

  function handleUpdateCategories(newCategories: Category[]) {
    setCategories(newCategories)
    const storeId = localStorage.getItem('selected-store-id')
    api.saveConfig(newCategories, storeId || undefined)
  }

  if (status === 'loading') {
      return (
        <div className="loading-screen">
          <div className="loading-content">
            <div className="spinner"></div>
            <h1>Sincronizando Precios</h1>
            <p>Obteniendo la última configuración desde la nube...</p>
          </div>
        </div>
      )
  }

  if (status === 'offline') {
    return (
        <div className="error-screen offline-mode">
            <h1>⚠️ Modo Sin Conexión</h1>
            <p>No se pudo sincronizar con el servidor.</p>
            <div className="warning-box">
                <strong>ATENCIÓN:</strong> Los precios mostrados pueden estar <strong>desactualizados</strong>.
            </div>
            <p className="error-hint">¿Desea continuar con los datos guardados localmente?</p>
            <div className="button-group">
                <button className="primary-button" onClick={() => setStatus('ready')}>
                    Continuar con Precios Locales
                </button>
                <button className="secondary-button" onClick={() => window.location.reload()}>
                    Reintentar Conexión
                </button>
            </div>
        </div>
    )
  }

  if (status === 'error') {
      return (
          <div className="error-screen">
              <h1>⚠️ Sin Conexión</h1>
              <p>No se puede conectar con el Servidor en la Nube (Render).</p>
              <p className="error-hint">Verifique su conexión a internet.</p>
              <button onClick={() => window.location.reload()}>Reintentar</button>
          </div>
      )
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<POSPage categories={categories} isOffline={status === 'offline' || (status === 'ready' && !navigator.onLine)} />} />
        <Route 
          path="/config" 
          element={
            <ConfigPage 
              categories={categories} 
              onUpdateCategory={handleUpdateCategory} 
              onUpdateCategories={handleUpdateCategories}
            />
          } 
        />
      </Routes>
      {/* <DebugConsole /> */}
    </>
  )
}

export default App
