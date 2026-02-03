import { useState, useRef, useEffect } from 'react'
import type { Category, Product, Store } from '../types'
import { useNavigate } from 'react-router-dom'
import { CornerUpLeft, Download, Upload, QrCode, LogOut, Plus, GripVertical, Trash2, Store as StoreIcon, Edit2, Check, X, Tag } from 'lucide-react'
import CryptoJS from 'crypto-js'
import QRCode from 'react-qr-code'
import { api } from '../services/api'
import './ConfigPage.css'
import { DebouncedInput } from '../components/DebouncedInput'

interface ConfigPageProps {
  categories: Category[]
  onUpdateCategory: (category: Category) => void
  onUpdateCategories: (categories: Category[]) => void
}

const SECRET_KEY = 'los-terneros-secure-backup-key-2025'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export function ConfigPage({ categories, onUpdateCategory, onUpdateCategories }: ConfigPageProps) {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [importStatus, setImportStatus] = useState('')
  const [showQR, setShowQR] = useState(false)

  const [stores, setStores] = useState<Store[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(localStorage.getItem('selected-store-id'))
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null)
  const [tempStoreName, setTempStoreName] = useState('')
  const [tempStorePassword, setTempStorePassword] = useState('')
  const role = localStorage.getItem('pos-role') as 'admin' | 'master'

  const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0]?.id)
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null)
  const [swipedProductId, setSwipedProductId] = useState<string | null>(null)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  
  const selectedCategory = categories.find(c => c.id === selectedCategoryId)

  // Cargar locales al autenticar
  useEffect(() => {
    if (isAuthenticated) {
      api.getStores().then(setStores)
      
      // Si hay un local seleccionado, cargar su config
      if (selectedStoreId) {
        handleSelectStore(selectedStoreId)
      }
    }
  }, [isAuthenticated])

  async function handleSelectStore(storeId: string) {
    setSelectedStoreId(storeId)
    localStorage.setItem('selected-store-id', storeId)
    const config = await api.getConfig(storeId)
    if (config && config.categories) {
      onUpdateCategories(config.categories)
      if (config.categories.length > 0) {
        setSelectedCategoryId(config.categories[0].id)
      }
    } else {
      onUpdateCategories([])
      setSelectedCategoryId(undefined)
    }
  }

  async function handleAddStore() {
    try {
      // Fallback para crypto.randomUUID si no está disponible (ej: contextos no seguros)
      const id = (window.crypto && window.crypto.randomUUID) 
        ? window.crypto.randomUUID() 
        : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        
      const newStore: Store = { id, name: 'Nuevo Local', password: '' }
      console.log('Intentando agregar local:', newStore);
      
      const success = await api.saveStore(newStore)
      if (success) {
        const updatedStores = await api.getStores()
        setStores(updatedStores)
        setEditingStoreId(id)
        setTempStoreName('Nuevo Local')
        setTempStorePassword('')
      } else {
        alert('Error al guardar el nuevo local en el servidor.')
      }
    } catch (e) {
      console.error('Error en handleAddStore:', e);
      alert('Error inesperado al intentar agregar el local.')
    }
  }

  async function handleSaveStore(id: string) {
    const success = await api.saveStore({ id, name: tempStoreName, password: tempStorePassword })
    if (success) {
      setStores(await api.getStores())
      setEditingStoreId(null)
    }
  }

  async function handleDeleteStore(id: string) {
    if (!confirm('¿Estás seguro de eliminar este local? Se borrarán todos sus productos.')) return
    const success = await api.deleteStore(id)
    if (success) {
      setStores(await api.getStores())
      if (selectedStoreId === id) {
        setSelectedStoreId(null)
        localStorage.removeItem('selected-store-id')
        onUpdateCategories([])
      }
    }
  }

  // Gestión de Categorías
  function handleAddCategory() {
    const name = prompt('Nombre de la nueva categoría:')
    if (!name) return
    
    const newCategory: Category = {
      id: crypto.randomUUID(),
      label: name,
      products: []
    }
    
    const newCategories = [...categories, newCategory]
    onUpdateCategories(newCategories)
    setSelectedCategoryId(newCategory.id)
  }

  function handleRenameCategory(categoryId: string) {
    const category = categories.find(c => c.id === categoryId)
    if (!category) return
    
    const newName = prompt('Nuevo nombre para la categoría:', category.label)
    if (!newName) return
    
    const newCategories = categories.map(c => 
      c.id === categoryId ? { ...c, label: newName } : c
    )
    onUpdateCategories(newCategories)
  }

  function handleDeleteCategory(categoryId: string) {
    if (!confirm('¿Eliminar esta categoría y todos sus productos?')) return
    
    const newCategories = categories.filter(c => c.id !== categoryId)
    onUpdateCategories(newCategories)
    if (selectedCategoryId === categoryId) {
      setSelectedCategoryId(newCategories[0]?.id)
    }
  }

  function handleDragStart(index: number) {
    setDraggedItemIndex(index)
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    if (draggedItemIndex === null || draggedItemIndex === index) return
    if (!selectedCategory) return

    const newProducts = [...selectedCategory.products]
    const draggedItem = newProducts[draggedItemIndex]
    newProducts.splice(draggedItemIndex, 1)
    newProducts.splice(index, 0, draggedItem)
    
    setDraggedItemIndex(index)
    
    onUpdateCategory({
      ...selectedCategory,
      products: newProducts
    })
  }

  function handleDragEnd() {
    setDraggedItemIndex(null)
  }

  function handleTouchStart(e: React.TouchEvent, productId: string) {
    setTouchStart(e.touches[0].clientX)
  }

  function handleTouchMove(e: React.TouchEvent, productId: string) {
    if (touchStart === null) return
    const currentX = e.touches[0].clientX
    const diff = touchStart - currentX
    
    // Deslizar a la izquierda revela el botón
    if (diff > 40) {
      setSwipedProductId(productId)
    } 
    // Deslizar a la derecha lo oculta
    else if (diff < -40) {
      setSwipedProductId(null)
    }
  }

  function handleTouchEnd() {
    setTouchStart(null)
  }

  function handleDeleteProduct(productId: string) {
    if (!selectedCategory) return
    
    const updatedProducts = selectedCategory.products.filter(p => p.id !== productId)
    onUpdateCategory({
      ...selectedCategory,
      products: updatedProducts
    })
    setSwipedProductId(null)
  }

  async function handleLogin() {
    setError('')
    try {
      const result = await api.login(password)
      if (result.success && result.role) {
        setIsAuthenticated(true)
        localStorage.setItem('pos-role', result.role)
        console.log(`Rol activo: ${result.role}`)
      } else {
        setError(result.error || 'Clave incorrecta')
      }
    } catch (e) {
      setError('Error de conexión con el servidor')
    }
  }

  function handleLogout() {
    localStorage.removeItem('pos-role')
    setIsAuthenticated(false)
    window.location.reload()
  }

  function handleProductChange(product: Product, field: keyof Product, value: string | number) {
    if (!selectedCategory) return

    const updatedProduct = { ...product, [field]: value }
    const updatedProducts = selectedCategory.products.map(p => 
      p.id === product.id ? updatedProduct : p
    )

    onUpdateCategory({
      ...selectedCategory,
      products: updatedProducts
    })
  }

  function handleAddProduct() {
    if (!selectedCategory) return

    const newProduct: Product = {
      id: crypto.randomUUID(),
      name: 'Nuevo Producto',
      pricePerUnit: 0,
      unitType: 'unit'
    }

    onUpdateCategory({
      ...selectedCategory,
      products: [...selectedCategory.products, newProduct]
    })
  }

  function handleExportData(type: 'products' | 'tickets') {
    const data: any = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      type
    }

    if (type === 'products') {
      data.categories = JSON.parse(localStorage.getItem('pos-categories') || '[]')
    } else {
      data.tickets = JSON.parse(localStorage.getItem('pos-closed-tickets') || '[]')
    }

    // Convertir a string JSON
    const jsonString = JSON.stringify(data)
    
    // Encriptar
    const encrypted = CryptoJS.AES.encrypt(jsonString, SECRET_KEY).toString()
    
    // Crear Blob con datos encriptados
    const blob = new Blob([encrypted], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    // Usar extensión .dat para indicar que no es JSON plano legible
    a.download = `backup-${type}-${new Date().toISOString().split('T')[0]}.dat`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleImportClick(type: 'products' | 'tickets') {
    if (fileInputRef.current) {
        fileInputRef.current.setAttribute('data-import-type', type)
        fileInputRef.current.click()
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    const importType = event.target.getAttribute('data-import-type')
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const encryptedContent = e.target?.result as string
        
        // Desencriptar
        const bytes = CryptoJS.AES.decrypt(encryptedContent, SECRET_KEY)
        const decryptedString = bytes.toString(CryptoJS.enc.Utf8)
        
        if (!decryptedString) {
            throw new Error('No se pudo desencriptar el archivo (posiblemente corrupto o clave incorrecta)')
        }

        const data = JSON.parse(decryptedString)

        if (importType === 'products') {
            if (data.categories) {
                localStorage.setItem('pos-categories', JSON.stringify(data.categories))
                setImportStatus('Productos restaurados correctamente.')
            } else {
                setImportStatus('El archivo no contiene productos válidos.')
                return
            }
        } else if (importType === 'tickets') {
            if (data.tickets) {
                localStorage.setItem('pos-closed-tickets', JSON.stringify(data.tickets))
                setImportStatus('Ventas restauradas correctamente.')
            } else {
                setImportStatus('El archivo no contiene ventas válidas.')
                return
            }
        }

        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } catch (err) {
        console.error(err)
        setImportStatus('Error: Archivo inválido o corrupto.')
      }
    }
    reader.readAsText(file)
    // Reset input
    event.target.value = ''
  }

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1 className="login-title">Acceso Restringido</h1>
          <input
            className="login-input"
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          <button 
            className="login-btn" 
            onClick={handleLogin}
          >
            Ingresar
          </button>
           <button 
            className="back-btn" 
            onClick={() => navigate('/')}
          >
            Volver
          </button>
          {error && <p className="error-msg">{error}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="config-page">
      {/* Sección de Locales */}
      <div className="stores-section">
        <div className="section-header">
          <div className="header-title">
            <StoreIcon size={20} />
            <h2>Locales</h2>
          </div>
          {role === 'admin' && (
            <button className="add-store-btn" onClick={handleAddStore}>
              <Plus size={16} /> Agregar Local
            </button>
          )}
        </div>
        <div className="stores-list">
          {stores.map(store => (
            <div 
              key={store.id} 
              className={`store-card ${selectedStoreId === store.id ? 'selected' : ''}`}
              onClick={() => handleSelectStore(store.id)}
            >
              {editingStoreId === store.id ? (
                <div className="store-edit-form" onClick={e => e.stopPropagation()}>
                  <input 
                    className="store-edit-input"
                    type="text" 
                    value={tempStoreName} 
                    onChange={e => setTempStoreName(e.target.value)} 
                    placeholder="Nombre del local"
                    autoFocus
                  />
                  {role === 'admin' && (
                    <input 
                      className="store-edit-input"
                      type="password" 
                      value={tempStorePassword} 
                      onChange={e => setTempStorePassword(e.target.value)} 
                      placeholder="Nueva Clave"
                    />
                  )}
                  <div className="edit-actions">
                    <button className="save-store-btn" onClick={() => handleSaveStore(store.id)}>
                      <Check size={16}/>
                    </button>
                    <button className="cancel-store-btn" onClick={() => setEditingStoreId(null)}>
                      <X size={16}/>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="store-name">{store.name}</span>
                  {role === 'admin' && (
                    <div className="store-actions">
                      <button 
                        className="store-icon-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingStoreId(store.id)
                          setTempStoreName(store.name)
                          setTempStorePassword('')
                        }}
                      >
                        <Edit2 size={14}/>
                      </button>
                      <button 
                        className="store-icon-btn delete"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteStore(store.id)
                        }}
                      >
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
          {stores.length === 0 && <p className="no-stores-msg">No hay locales registrados.</p>}
        </div>
      </div>

      <div className="config-categories">
        <button 
          className="config-back-icon-btn" 
          onClick={() => navigate('/')}
          title="Volver al POS"
        >
          <CornerUpLeft size={16} />
        </button>

        <button 
          className="config-back-icon-btn" 
          onClick={handleLogout}
          title="Cerrar Sesión (Dejar de ser Maestro)"
          style={{ marginLeft: '10px', backgroundColor: '#e74c3c' }}
        >
          <LogOut size={16} />
        </button>

        {categories.map(cat => (
          <div key={cat.id} className="category-pill-container">
            <button
              className={`config-category-btn ${selectedCategoryId === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategoryId(cat.id)}
            >
              {cat.label}
            </button>
            {role === 'master' && selectedCategoryId === cat.id && (
              <div className="category-actions">
                <button 
                  className="cat-action-btn" 
                  onClick={() => handleRenameCategory(cat.id)}
                  title="Renombrar categoría"
                >
                  <Edit2 size={12}/>
                </button>
                <button 
                  className="cat-action-btn delete" 
                  onClick={() => handleDeleteCategory(cat.id)}
                  title="Eliminar categoría"
                >
                  <Trash2 size={12}/>
                </button>
              </div>
            )}
          </div>
        ))}

        {role === 'master' && selectedStoreId && (
          <button 
            className="add-category-pill-btn" 
            onClick={handleAddCategory}
            title="Agregar Categoría"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {!selectedStoreId ? (
        <div className="no-store-selected-msg">
          <StoreIcon size={48} />
          <p>Seleccione un local para gestionar sus productos y precios.</p>
        </div>
      ) : (
        <div className="config-table-container">
          <table className="config-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th style={{ width: '50%' }}>Nombre</th>
                <th style={{ width: '25%', textAlign: 'right' }}>Precio</th>
                <th style={{ width: '25%', textAlign: 'center' }}>Unidad</th>
              </tr>
            </thead>
            <tbody>
              {selectedCategory?.products.map((product, index) => (
                <tr 
                  key={product.id}
                  draggable
                  onDragStart={(e) => {
                    // Solo permitir arrastrar si se hace desde el handle
                    const target = e.target as HTMLElement;
                    if (!target.closest('.drag-handle')) {
                      e.preventDefault();
                      return;
                    }
                    handleDragStart(index);
                  }}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`${draggedItemIndex === index ? 'dragging' : ''} ${swipedProductId === product.id ? 'swiped' : ''}`}
                  onTouchStart={(e) => handleTouchStart(e, product.id)}
                  onTouchMove={(e) => handleTouchMove(e, product.id)}
                  onTouchEnd={handleTouchEnd}
                >
                  <td className="drag-handle-cell">
                    <div className="drag-handle">
                      <GripVertical size={20} />
                    </div>
                  </td>
                  <td>
                    <DebouncedInput
                      className="config-input"
                      type="text"
                      value={product.name}
                      onChangeValue={(val) => handleProductChange(product, 'name', val)}
                    />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <DebouncedInput
                      className="config-input"
                      type="number"
                      value={product.pricePerUnit}
                      onChangeValue={(val) => handleProductChange(product, 'pricePerUnit', Number(val))}
                      style={{ textAlign: 'right' }}
                    />
                  </td>
                   <td style={{ textAlign: 'center', position: 'relative' }}>
                    <select
                      className="config-select"
                      value={product.unitType}
                      onChange={(e) => handleProductChange(product, 'unitType', e.target.value)}
                    >
                      <option value="weight">Kg</option>
                      <option value="unit">Un</option>
                    </select>
                    
                    <button 
                      className="mobile-delete-btn"
                      onClick={() => handleDeleteProduct(product.id)}
                      title="Eliminar producto"
                    >
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="add-product-container">
            <button className="add-product-btn" onClick={handleAddProduct}>
              <Plus size={18} />
              Agregar Producto
            </button>
          </div>
        </div>
      )}

      <div className="data-management-section">
        <h3>Gestión de Datos</h3>
        
        <div className="data-actions">
          <div className="data-group">
             <span className="data-group-title">Sincronización (Modo Receptor)</span>
             <button className="data-btn qr-btn" onClick={() => setShowQR(!showQR)}>
                <QrCode size={18} />
                {showQR ? 'Ocultar QR' : 'Mostrar QR Servidor'}
             </button>
             {showQR && (
                <div style={{ marginTop: '10px', background: 'white', padding: '10px', display: 'inline-block', borderRadius: '8px' }}>
                    <QRCode value={`${API_URL}/sync`} size={150} />
                    <p style={{ color: 'black', fontSize: '10px', marginTop: '5px', textAlign: 'center' }}>
                        {API_URL}/sync
                    </p>
                </div>
             )}
          </div>

          <div className="data-group">
            <span className="data-group-title">Productos y Precios</span>
            <button className="data-btn export-btn" onClick={() => handleExportData('products')}>
              <Download size={18} />
              Exportar Productos
            </button>
            <button className="data-btn import-btn" onClick={() => handleImportClick('products')}>
              <Upload size={18} />
              Importar Productos
            </button>
          </div>

          <div className="data-group">
            <span className="data-group-title">Historial de Ventas</span>
            <button className="data-btn export-btn" onClick={() => handleExportData('tickets')}>
              <Download size={18} />
              Exportar Ventas
            </button>
            <button className="data-btn import-btn" onClick={() => handleImportClick('tickets')}>
              <Upload size={18} />
              Importar Ventas
            </button>
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            style={{ display: 'none' }} 
            accept=".dat"
          />
        </div>
        {importStatus && <p className="import-status">{importStatus}</p>}
      </div>
    </div>
  )
}
