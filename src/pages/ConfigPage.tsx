import { useState, useRef, useEffect } from 'react'
import type { Category, Product, Store } from '../types'
import { useNavigate } from 'react-router-dom'
import { CornerUpLeft, LogOut, Plus, GripVertical, Trash2, Store as StoreIcon, Edit2, Check, X, Eye, EyeOff } from 'lucide-react'
import { api } from '../services/api'
import './ConfigPage.css'
import { DebouncedInput } from '../components/DebouncedInput'

interface ConfigPageProps {
  categories: Category[]
  onUpdateCategory: (category: Category) => void
  onUpdateCategories: (categories: Category[]) => void
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export function ConfigPage({ categories, onUpdateCategory, onUpdateCategories }: ConfigPageProps) {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const [stores, setStores] = useState<Store[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(localStorage.getItem('selected-store-id'))
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null)
  const [tempStoreName, setTempStoreName] = useState('')
  const [tempStorePassword, setTempStorePassword] = useState('')
  const [isConfigLoading, setIsConfigLoading] = useState(false)
  const role = localStorage.getItem('pos-role') as 'admin' | 'master'

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined)
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
    setIsConfigLoading(true)
    setSelectedStoreId(storeId)
    localStorage.setItem('selected-store-id', storeId)
    try {
      const config = await api.getConfig(storeId)
      if (config && config.categories) {
        onUpdateCategories(config.categories)
        if (config.categories.length > 0) {
          setSelectedCategoryId(config.categories[0].id)
        } else {
          setSelectedCategoryId(undefined)
        }
      } else {
        onUpdateCategories([])
        setSelectedCategoryId(undefined)
      }
    } finally {
      setIsConfigLoading(false)
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

  function handleToggleCategoryDisabled(categoryId: string) {
    const newCategories = categories.map(c => 
      c.id === categoryId ? { ...c, disabled: !c.disabled } : c
    )
    onUpdateCategories(newCategories)
  }

  function handleToggleProductDisabled(product: Product) {
    if (!selectedCategory) return
    const updatedProducts = selectedCategory.products.map(p => 
      p.id === product.id ? { ...p, disabled: !p.disabled } : p
    )
    onUpdateCategory({
      ...selectedCategory,
      products: updatedProducts
    })
  }

  function handleDragStart(index: number) {
    setDraggedItemIndex(index)
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    if (role !== 'master') return // Solo Master puede reordenar
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
    if (role !== 'master') return // Solo Master puede deslizar para borrar
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
    if (role !== 'master') return // Solo Master puede borrar
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
      if (result.success && (result.role === 'admin' || result.role === 'master')) {
        setIsAuthenticated(true)
        localStorage.setItem('pos-role', result.role)
        console.log(`Rol autorizado: ${result.role}`)
      } else {
        setError('Acceso denegado. Solo Admin o Master.')
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
    if (role !== 'master') return // Solo Master puede editar
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
    if (role !== 'master') return // Solo Master puede agregar
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
            autoFocus
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
            <h2>{role === 'admin' ? 'Gestión de Locales' : 'Seleccionar Local'}</h2>
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
          title={role === 'master' ? "Cerrar Sesión (Dejar de ser Maestro)" : "Cerrar Sesión"}
          style={{ marginLeft: '10px', backgroundColor: '#e74c3c' }}
        >
          <LogOut size={16} />
        </button>

        {!isConfigLoading && categories.map(cat => (
          <div key={cat.id} className={`category-pill-container ${cat.disabled ? 'disabled' : ''}`}>
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
                  onClick={() => handleToggleCategoryDisabled(cat.id)}
                  title={cat.disabled ? "Habilitar categoría" : "Deshabilitar categoría"}
                >
                  {cat.disabled ? <Eye size={12}/> : <EyeOff size={12}/>}
                </button>
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

        {role === 'master' && selectedStoreId && !isConfigLoading && (
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
          <p>Seleccione un local para ver sus productos y precios.</p>
        </div>
      ) : isConfigLoading ? (
        <div className="no-store-selected-msg">
          <div className="spinner"></div>
          <p>Cargando configuración desde Neon...</p>
        </div>
      ) : (
        <div className="config-table-container">
          <table className="config-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th style={{ width: '40%' }}>Nombre</th>
                <th style={{ width: '20%', textAlign: 'right' }}>Precio</th>
                <th style={{ width: '20%', textAlign: 'center' }}>Unidad</th>
                <th style={{ width: '20%', textAlign: 'center' }}>{role === 'master' ? 'Acciones' : 'Estado'}</th>
              </tr>
            </thead>
            <tbody>
              {selectedCategory?.products.map((product, index) => (
                <tr 
                  key={product.id}
                  draggable={role === 'master'}
                  onDragStart={(e) => {
                    if (role !== 'master') return;
                    const target = e.target as HTMLElement;
                    if (!target.closest('.drag-handle')) {
                      e.preventDefault();
                      return;
                    }
                    handleDragStart(index);
                  }}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`${draggedItemIndex === index ? 'dragging' : ''} ${swipedProductId === product.id ? 'swiped' : ''} ${product.disabled ? 'product-disabled' : ''}`}
                  onTouchStart={(e) => handleTouchStart(e, product.id)}
                  onTouchMove={(e) => handleTouchMove(e, product.id)}
                  onTouchEnd={handleTouchEnd}
                >
                  <td className="drag-handle-cell">
                    <div className={`drag-handle ${role !== 'master' ? 'disabled' : ''}`}>
                      <GripVertical size={20} />
                    </div>
                  </td>
                  <td>
                    <DebouncedInput
                      className="config-input"
                      type="text"
                      value={product.name}
                      onChangeValue={(val) => handleProductChange(product, 'name', val)}
                      readOnly={role !== 'master'}
                    />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <DebouncedInput
                      className="config-input"
                      type="number"
                      value={product.pricePerUnit}
                      onChangeValue={(val) => handleProductChange(product, 'pricePerUnit', Number(val))}
                      style={{ textAlign: 'right' }}
                      readOnly={role !== 'master'}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <select
                      className="config-select"
                      value={product.unitType}
                      onChange={(e) => handleProductChange(product, 'unitType', e.target.value)}
                      disabled={role !== 'master'}
                    >
                      <option value="weight">Kg</option>
                      <option value="unit">Un</option>
                    </select>
                  </td>
                  <td style={{ textAlign: 'center', position: 'relative' }}>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                      {role === 'master' ? (
                        <>
                          <button 
                            className="store-icon-btn" 
                            onClick={() => handleToggleProductDisabled(product)}
                            title={product.disabled ? "Habilitar" : "Deshabilitar"}
                          >
                            {product.disabled ? <Eye size={16}/> : <EyeOff size={16}/>}
                          </button>
                          <button 
                            className="store-icon-btn delete"
                            onClick={() => handleDeleteProduct(product.id)}
                            title="Eliminar producto"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        <span style={{ fontSize: '12px', color: product.disabled ? '#ff5252' : '#4caf50' }}>
                          {product.disabled ? 'Inactivo' : 'Activo'}
                        </span>
                      )}
                    </div>
                    
                    {role === 'master' && (
                      <button 
                        className="mobile-delete-btn"
                        onClick={() => handleDeleteProduct(product.id)}
                        title="Eliminar producto"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {role === 'master' && (
            <div className="add-product-container">
              <button className="add-product-btn" onClick={handleAddProduct}>
                <Plus size={18} />
                Agregar Producto
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
