import { useState, useRef } from 'react'
import type { Category, Product } from '../types'
import { useNavigate } from 'react-router-dom'
import { CornerUpLeft, Download, Upload, QrCode, LogOut } from 'lucide-react'
import CryptoJS from 'crypto-js'
import QRCode from 'react-qr-code'
import { api } from '../services/api'
import './ConfigPage.css'
import { DebouncedInput } from '../components/DebouncedInput'

interface ConfigPageProps {
  categories: Category[]
  onUpdateCategory: (category: Category) => void
}

const SECRET_KEY = 'los-terneros-secure-backup-key-2025'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export function ConfigPage({ categories, onUpdateCategory }: ConfigPageProps) {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [importStatus, setImportStatus] = useState('')
  const [showQR, setShowQR] = useState(false)

  const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0]?.id)
  
  const selectedCategory = categories.find(c => c.id === selectedCategoryId)

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
          <button
            key={cat.id}
            className={`config-category-btn ${selectedCategoryId === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategoryId(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="config-table-container">
        <table className="config-table">
          <thead>
            <tr>
              <th style={{ width: '50%' }}>Nombre</th>
              <th style={{ width: '25%', textAlign: 'right' }}>Precio</th>
              <th style={{ width: '25%', textAlign: 'center' }}>Unidad</th>
            </tr>
          </thead>
          <tbody>
            {selectedCategory?.products.map(product => (
              <tr key={product.id}>
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
                 <td style={{ textAlign: 'center' }}>
                  <select
                    className="config-select"
                    value={product.unitType}
                    onChange={(e) => handleProductChange(product, 'unitType', e.target.value)}
                  >
                    <option value="weight">Kg</option>
                    <option value="unit">Un</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
