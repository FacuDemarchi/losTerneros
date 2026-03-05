import { useState, useEffect, Fragment } from 'react'
import type { Category, Product, Store } from '../types'
import { useNavigate } from 'react-router-dom'
import { CornerUpLeft, LogOut, Plus, GripVertical, Trash2, Store as StoreIcon, Edit2, Check, X, Eye, EyeOff, ChevronDown, ChevronUp, Search, Users, User } from 'lucide-react'
import { api } from '../services/api'
import './ConfigPage.css'
import { DebouncedInput } from '../components/DebouncedInput'

interface ConfigPageProps {
  categories: Category[]
  onUpdateCategory: (category: Category) => void
  onUpdateCategories: (categories: Category[]) => void
}

export function ConfigPage({ categories, onUpdateCategory, onUpdateCategories }: ConfigPageProps) {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [permissions, setPermissions] = useState<any>(null)

  // User Management States
  const [showUserManagement, setShowUserManagement] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [userForm, setUserForm] = useState({ username: '', allowedCategories: [] as string[] })

  const [stores, setStores] = useState<Store[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(localStorage.getItem('selected-store-id'))
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null)
  const [tempStoreName, setTempStoreName] = useState('')
  const [tempStorePassword, setTempStorePassword] = useState('')
  const [isConfigLoading, setIsConfigLoading] = useState(false)
  const role = localStorage.getItem('pos-role') as 'admin' | 'master' | 'cashier'

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined)
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null)
  const [swipedProductId, setSwipedProductId] = useState<string | null>(null)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  
  // Gestión de Composición
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null)
  const [componentSearch, setComponentSearch] = useState('')
  
  const selectedCategory = categories.find(c => c.id === selectedCategoryId)
  
  // Filtrar categorías visibles según permisos
  const visibleCategories = role === 'cashier' 
    ? categories.filter(cat => permissions?.allowedCategories?.includes('*') || permissions?.allowedCategories?.includes(cat.id))
    : categories;

  const allProducts = categories.flatMap(c => c.products)

  function calculateBolsónPrice(composition: Product['composition'], products: Product[]) {
    if (!composition) return 0
    return composition.reduce((total, item) => {
      const compProduct = products.find(p => p.id === item.productId)
      return total + (compProduct ? compProduct.pricePerUnit * item.quantity : 0)
    }, 0)
  }

  function updateAllBolsonesPrices(allCats: Category[]): Category[] {
    const allProds = allCats.flatMap(c => c.products)
    return allCats.map(c => ({
      ...c,
      products: c.products.map(p => {
        if (p.composition) {
          return { ...p, pricePerUnit: calculateBolsónPrice(p.composition, allProds) }
        }
        return p
      })
    }))
  }

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
      const userId = localStorage.getItem('pos-user-id')
      const config = await api.getConfig(storeId, userId || undefined)
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

  function handleTouchStart(e: React.TouchEvent) {
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
      if (result.success && (result.role === 'admin' || result.role === 'master' || result.role === 'cashier')) {
        setIsAuthenticated(true)
        localStorage.setItem('pos-role', result.role)
        if (result.token) {
            localStorage.setItem('pos-token', result.token)
        }
        if (result.userId) {
            localStorage.setItem('pos-user-id', result.userId)
        } else {
            localStorage.removeItem('pos-user-id')
        }
        
        // Integrar nombre de usuario desde la respuesta
        if (result.username) {
            setUsername(result.username)
            localStorage.setItem('pos-user-name', result.username)
        } else {
            setUsername('')
            localStorage.removeItem('pos-user-name')
        }

        // Integrar permisos
        if (result.permissions) {
            setPermissions(result.permissions)
            localStorage.setItem('pos-user-permissions', JSON.stringify(result.permissions))
        } else {
            setPermissions(null)
            localStorage.removeItem('pos-user-permissions')
        }

        console.log(`Rol autorizado: ${result.role}`)
      } else {
        setError('Acceso denegado. Contraseña incorrecta.')
      }
    } catch (e) {
      setError('Error de conexión con el servidor')
    }
  }

  function handleLogout() {
    localStorage.removeItem('pos-role')
    localStorage.removeItem('pos-user-id')
    localStorage.removeItem('pos-token')
    localStorage.removeItem('pos-user-name')
    localStorage.removeItem('pos-user-permissions')
    setIsAuthenticated(false)
    window.location.reload()
  }

  // User Management Functions
  async function loadUsers() {
    const data = await api.getUsers()
    setUsers(data)
  }

  async function handleSaveUser() {
    // Validar que el nombre no esté vacío
    if (!userForm.username.trim()) {
        alert('El nombre de usuario es obligatorio')
        return
    }

    const userData = {
        id: editingUser?.id,
        username: userForm.username.trim(),
        role: 'cashier',
        permissions: { allowedCategories: ['*'] } // Simplificado: Acceso total por defecto
    }
    const result = await api.saveUser(userData)
    if (result.success) {
        setEditingUser(null)
        setUserForm({ username: '', allowedCategories: [] })
        loadUsers()
    } else {
        alert(result.error || 'Error al guardar usuario')
    }
  }

  async function handleDeleteUser(id: string) {
      if (!confirm('¿Eliminar usuario?')) return
      const success = await api.deleteUser(id)
      if (success) loadUsers()
  }

  function handleProductChange(product: Product, field: keyof Product, value: string | number) {
    if (role !== 'master' && role !== 'cashier') return // Solo Master o Cajero pueden editar
    if (role === 'cashier' && field !== 'pricePerUnit') return // Cajero solo precio
    if (!selectedCategory) return

    const updatedProduct = { ...product, [field]: value }
    let newCategories = categories.map(c => 
      c.id === selectedCategoryId ? {
        ...c,
        products: c.products.map(p => p.id === product.id ? updatedProduct : p)
      } : c
    )

    // Si cambió un precio, recalculamos todos los bolsones
    if (field === 'pricePerUnit') {
      newCategories = updateAllBolsonesPrices(newCategories)
    }

    onUpdateCategories(newCategories)
  }

  function handleCompositionChange(productId: string, newComposition: Product['composition']) {
    if (role !== 'admin') return // Solo Admin puede modificar composición
    if (!selectedCategory) return

    const allProds = categories.flatMap(c => c.products)
    const newPrice = calculateBolsónPrice(newComposition, allProds)

    const updatedProducts = selectedCategory.products.map(p => 
      p.id === productId ? { ...p, composition: newComposition, pricePerUnit: newPrice } : p
    )

    onUpdateCategory({
      ...selectedCategory,
      products: updatedProducts
    })
  }

  function addComponentToBolsón(bolsónId: string, componentId: string) {
    const bolsón = selectedCategory?.products.find(p => p.id === bolsónId)
    if (!bolsón) return

    const currentComp = bolsón.composition || []
    if (currentComp.find(c => c.productId === componentId)) return

    const newComp = [...currentComp, { productId: componentId, quantity: 1 }]
    handleCompositionChange(bolsónId, newComp)
    setComponentSearch('')
  }

  function removeComponentFromBolsón(bolsónId: string, componentId: string) {
    const bolsón = selectedCategory?.products.find(p => p.id === bolsónId)
    if (!bolsón) return

    const newComp = (bolsón.composition || []).filter(c => c.productId !== componentId)
    handleCompositionChange(bolsónId, newComp)
  }

  function updateComponentQuantity(bolsónId: string, componentId: string, quantity: number) {
    const bolsón = selectedCategory?.products.find(p => p.id === bolsónId)
    if (!bolsón) return

    const newComp = (bolsón.composition || []).map(c => 
      c.productId === componentId ? { ...c, quantity } : c
    )
    handleCompositionChange(bolsónId, newComp)
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

        {username && (
          <div className="user-badge" style={{ 
            marginLeft: '10px', 
            padding: '5px 10px', 
            backgroundColor: '#34495e', 
            color: 'white', 
            borderRadius: '4px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <User size={14} />
            <span>{username}</span>
          </div>
        )}

        <button 
          className="config-back-icon-btn" 
          onClick={handleLogout}
          title={role === 'master' ? "Cerrar Sesión (Dejar de ser Maestro)" : "Cerrar Sesión"}
          style={{ marginLeft: '10px', backgroundColor: '#e74c3c' }}
        >
          <LogOut size={16} />
        </button>

        {role === 'admin' && (
          <button 
            className="config-back-icon-btn" 
            onClick={() => { setShowUserManagement(true); loadUsers(); }}
            title="Gestionar Cajeros"
            style={{ marginLeft: '10px' }}
          >
            <Users size={16} />
          </button>
        )}

        {!isConfigLoading && visibleCategories.map(cat => (
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
                <th style={{ width: '35%' }}>Nombre</th>
                <th style={{ width: '15%' }}>Ext. ID</th>
                <th style={{ width: '15%', textAlign: 'right' }}>Precio</th>
                <th style={{ width: '15%', textAlign: 'center' }}>Unidad</th>
                <th style={{ width: '20%', textAlign: 'center' }}>{role === 'master' ? 'Acciones' : 'Estado'}</th>
              </tr>
            </thead>
            <tbody>
              {selectedCategory?.products.map((product, index) => (
                <Fragment key={product.id}>
                  <tr 
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
                    className={`${draggedItemIndex === index ? 'dragging' : ''} ${swipedProductId === product.id ? 'swiped' : ''} ${product.disabled ? 'product-disabled' : ''} ${expandedProductId === product.id ? 'expanded-row' : ''}`}
                    onTouchStart={handleTouchStart}
                    onTouchMove={(e) => handleTouchMove(e, product.id)}
                    onTouchEnd={handleTouchEnd}
                  >
                    <td className="drag-handle-cell">
                      <div className={`drag-handle ${role !== 'master' ? 'disabled' : ''}`}>
                        <GripVertical size={20} />
                      </div>
                    </td>
                    <td>
                      <div className="product-name-cell">
                        {selectedCategoryId === 'bolsones' && role === 'admin' && (
                          <button 
                            className="expand-btn"
                            onClick={() => setExpandedProductId(expandedProductId === product.id ? null : product.id)}
                          >
                            {expandedProductId === product.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                          </button>
                        )}
                        <DebouncedInput
                          className="config-input"
                          type="text"
                          value={product.name}
                          onChangeValue={(val) => handleProductChange(product, 'name', val)}
                          readOnly={role !== 'master'}
                        />
                      </div>
                    </td>
                    <td>
                      <DebouncedInput
                        className="config-input"
                        type="text"
                        value={product.externalId || ''}
                        onChangeValue={(val) => handleProductChange(product, 'externalId', val)}
                        readOnly={role !== 'master'}
                        placeholder="-"
                      />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <DebouncedInput
                        className="config-input"
                        type="number"
                        value={product.pricePerUnit}
                        onChangeValue={(val) => handleProductChange(product, 'pricePerUnit', Number(val))}
                        style={{ textAlign: 'right' }}
                        readOnly={role !== 'master' || !!product.composition}
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
                  {expandedProductId === product.id && (
                    <tr className="composition-row">
                      <td colSpan={6}>
                        <div className="composition-container">
                          <div className="composition-header">
                            <h3>Composición del Bolsón</h3>
                            <div className="add-component-search">
                              <div className="search-input-wrapper">
                                <Search size={14} className="search-icon"/>
                                <input 
                                  type="text" 
                                  placeholder="Buscar producto para agregar..." 
                                  value={componentSearch}
                                  onChange={(e) => setComponentSearch(e.target.value)}
                                />
                              </div>
                              {componentSearch && (
                                <div className="search-results-popover">
                                  {allProducts
                                    .filter(p => p.id !== product.id && p.name.toLowerCase().includes(componentSearch.toLowerCase()))
                                    .slice(0, 5)
                                    .map(p => (
                                      <div key={p.id} className="search-result-item" onClick={() => addComponentToBolsón(product.id, p.id)}>
                                        <span>{p.name}</span>
                                        <span className="search-result-price">${p.pricePerUnit}</span>
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <table className="composition-table">
                            <thead>
                              <tr>
                                <th>Componente</th>
                                <th style={{ textAlign: 'right' }}>Cant.</th>
                                <th style={{ textAlign: 'right' }}>Precio Unit.</th>
                                <th style={{ textAlign: 'right' }}>Subtotal</th>
                                <th style={{ width: '40px' }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {(product.composition || []).map(comp => {
                                const compProd = allProducts.find(p => p.id === comp.productId)
                                return (
                                  <tr key={comp.productId}>
                                    <td>{compProd?.name || 'Desconocido'}</td>
                                    <td style={{ textAlign: 'right' }}>
                                      <input 
                                        type="number" 
                                        className="comp-qty-input"
                                        value={comp.quantity} 
                                        onChange={(e) => updateComponentQuantity(product.id, comp.productId, Number(e.target.value))}
                                        step="0.01"
                                      />
                                    </td>
                                    <td style={{ textAlign: 'right' }}>${compProd?.pricePerUnit || 0}</td>
                                    <td style={{ textAlign: 'right' }}>${(compProd?.pricePerUnit || 0) * comp.quantity}</td>
                                    <td>
                                      <button className="comp-delete-btn" onClick={() => removeComponentFromBolsón(product.id, comp.productId)}>
                                        <X size={14}/>
                                      </button>
                                    </td>
                                  </tr>
                                )
                              })}
                              {(!product.composition || product.composition.length === 0) && (
                                <tr>
                                  <td colSpan={5} className="empty-composition">No hay componentes en este bolsón.</td>
                                </tr>
                              )}
                            </tbody>
                            <tfoot>
                              <tr>
                                <th colSpan={3} style={{ textAlign: 'right' }}>TOTAL CALCULADO:</th>
                                <th style={{ textAlign: 'right' }}>${product.pricePerUnit}</th>
                                <th></th>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
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

      {showUserManagement && (
        <div className="user-modal-overlay">
          <div className="user-modal-content">
            <div className="modal-header">
              <h2>Gestión de Cajeros</h2>
              <button className="close-btn" onClick={() => setShowUserManagement(false)}><X size={20} /></button>
            </div>
            
            <div className="user-management-container">
              {/* Lista de Usuarios */}
              <div className="users-list-panel">
                <h3>Cajeros Registrados</h3>
                <div className="users-list">
                  {users.map(u => (
                    <div key={u.id} className={`user-item ${editingUser?.id === u.id ? 'active' : ''}`}>
                      <div className="user-info">
                        <User size={16} />
                        <span>{u.username}</span>
                      </div>
                      <div className="user-actions">
                        <button onClick={() => {
                          setEditingUser(u)
                          setUserForm({ 
                            username: u.username, 
                            allowedCategories: u.permissions?.allowedCategories || []
                          })
                        }} title="Editar">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDeleteUser(u.id)} className="delete-btn" title="Eliminar">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {users.length === 0 && <p className="no-users">No hay cajeros registrados.</p>}
                </div>
                <button className="new-user-btn" onClick={() => {
                  setEditingUser(null)
                  setUserForm({ username: '', allowedCategories: [] })
                }}>
                  <Plus size={14} /> Nuevo Cajero
                </button>
              </div>

              {/* Formulario */}
                <div className="user-form-panel">
                  <h3>{editingUser ? 'Editar Cajero' : 'Nuevo Cajero'}</h3>
                  <div className="form-group">
                    <label>Nombre de Usuario (Acceso)</label>
                    <input 
                      type="text" 
                      value={userForm.username}
                      onChange={e => setUserForm({...userForm, username: e.target.value})}
                      placeholder="Ej: Juan"
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveUser()}
                      autoFocus
                    />
                    <p style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                      Este nombre funcionará como la única contraseña para ingresar.
                    </p>
                  </div>
                  
                  {/* Se han eliminado los permisos de categorías para simplificar */}
                  <input type="hidden" value={JSON.stringify(userForm.allowedCategories)} />

                  <div className="form-actions">
                    <button className="save-btn" onClick={handleSaveUser}>
                      <Check size={16} /> Guardar
                    </button>
                  </div>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
