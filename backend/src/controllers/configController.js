const { pool } = require('../config/db');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Helper para IP local (copiado de index.js original, útil para la respuesta de config)
function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const LOCAL_IP = getLocalIp();
const PORT = process.env.PORT || 3001;

// Función para intentar guardar en archivo local si existe (Dev Mode)
const trySaveToLocalFile = (categories) => {
    // Intentamos buscar el archivo relativo a donde se ejecuta el backend
    // Backend corre en /backend, el archivo está en ../src/data/products.ts
    const targetPath = path.join(__dirname, '..', '..', '..', 'src', 'data', 'products.ts');
    
    if (fs.existsSync(targetPath)) {
        console.log('📝 Detectado entorno local. Actualizando archivo products.ts...');
        try {
            const jsonContent = JSON.stringify(categories, null, 2);
            // Convertir claves sin comillas a con comillas para que sea JSON válido dentro del TS
            // (aunque JSON.stringify ya pone comillas, el formato TS del usuario espera un objeto JS)
            // Pero como es TS, podemos exportar el JSON directamente si ajustamos la sintaxis.
            
            // Para mantener consistencia con el formato original:
            const fileContent = `import type { Category } from '../types'

export const categories: Category[] = ${jsonContent}
`;
            fs.writeFileSync(targetPath, fileContent, 'utf8');
            console.log('✅ Archivo products.ts actualizado correctamente.');
        } catch (e) {
            console.error('❌ Error escribiendo archivo local:', e);
        }
    }
};

const getConfig = async (req, res) => {
  const { storeId, userId } = req.query;
  const configKey = storeId ? `categories_${storeId}` : 'categories';
  
  try {
    const result = await pool.query("SELECT value FROM app_config WHERE key = $1", [configKey]);
    const row = result.rows[0];

    // Si no hay configuración guardada para el local, devolver vacío
    let categories = row ? JSON.parse(row.value) : null;
    
    if (!categories && storeId) {
      categories = []; // No heredar de la configuración global
    }

    // Filtrar si es un usuario específico (cajero)
    if (userId && categories) {
        const userRes = await pool.query("SELECT permissions, role FROM app_users WHERE id = $1", [userId]);
        const user = userRes.rows[0];
        if (user && user.role === 'cashier') {
            const perms = user.permissions ? JSON.parse(user.permissions) : {};
            const allowedIds = perms.allowedCategories || [];
            categories = categories.filter(c => allowedIds.includes(c.id));
        }
    }
    
    res.json({ 
        categories, 
        serverIp: LOCAL_IP, 
        port: PORT
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

const saveConfig = async (req, res) => {
  const { categories, storeId, userId } = req.body;
  if (!categories) {
    res.status(400).json({ error: 'Categories data required' });
    return;
  }

  // Validación de permisos para cajeros
  if (userId) {
      try {
          const userRes = await pool.query("SELECT permissions, role FROM app_users WHERE id = $1", [userId]);
          const user = userRes.rows[0];
          
          if (user && user.role === 'cashier') {
              const perms = user.permissions ? JSON.parse(user.permissions) : {};
              const allowedIds = perms.allowedCategories || [];
              
              // Verificar que todas las categorías enviadas estén permitidas
              // Ojo: Si el cajero envía solo las que ve, está bien.
              // Pero debemos asegurarnos de no borrar las otras categorías de la base de datos global.
              // Problema: saveConfig sobrescribe TODO el JSON de categorías.
              // Solución: Si es cajero, primero leer la config actual, mezclar los cambios y guardar.
              
              const configKey = storeId ? `categories_${storeId}` : 'categories';
              const currentResult = await pool.query("SELECT value FROM app_config WHERE key = $1", [configKey]);
              let currentCategories = currentResult.rows[0] ? JSON.parse(currentResult.rows[0].value) : [];

              // Actualizar solo los precios de los productos en categorías permitidas
              const newCategoriesMap = new Map(categories.map(c => [c.id, c]));
              
              const updatedCategories = currentCategories.map(cat => {
                  if (allowedIds.includes(cat.id) && newCategoriesMap.has(cat.id)) {
                      const newCat = newCategoriesMap.get(cat.id);
                      // Solo permitir cambio de precios (y tal vez disabled status si se requiere)
                      // El usuario dijo "configurar los precios", asumimos solo precios.
                      // Mantener estructura original, solo actualizar precios de productos coincidentes
                      return {
                          ...cat,
                          products: cat.products.map(prod => {
                              const newProd = newCat.products.find(p => p.id === prod.id);
                              if (newProd) {
                                  return { ...prod, pricePerUnit: newProd.pricePerUnit };
                              }
                              return prod;
                          })
                      };
                  }
                  return cat; // Categoría no permitida o no enviada, se mantiene igual
              });
              
              // Usar updatedCategories para guardar
              // Reemplazar la variable categories del scope superior para que el emit use la versión completa
              // (aunque el emit podría enviar solo lo cambiado, pero el frontend espera array completo usualmente)
              // Pero saveConfig usa la variable 'categories' del body original para guardar.
              // Debo sobrescribir la lógica de guardado.
              
              const jsonVal = JSON.stringify(updatedCategories);
              await pool.query(`
                INSERT INTO app_config (key, value) VALUES ($1, $2)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
              `, [configKey, jsonVal]);
              
              // Intentar guardar en archivo local si es la config global (sin storeId)
              if (!storeId) {
                  trySaveToLocalFile(updatedCategories);
              }
              
              const io = req.app.get('io');
              if (io) io.emit('config_updated', { categories: updatedCategories, storeId });
              
              return res.json({ message: 'Configuration updated successfully (Partial)' });
          }
      } catch (err) {
          console.error('Error validando permisos de cajero:', err);
          return res.status(500).json({ error: 'Error validating permissions' });
      }
  }

  // Lógica normal para Admin/Master (sobrescribe todo)
  const configKey = storeId ? `categories_${storeId}` : 'categories';
  const jsonVal = JSON.stringify(categories);
  
  try {
    await pool.query(`
      INSERT INTO app_config (key, value) VALUES ($1, $2)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `, [configKey, jsonVal]);

    // Intentar guardar en archivo local si es la config global (sin storeId)
    if (!storeId) {
        trySaveToLocalFile(categories);
    }

    const io = req.app.get('io');
    if (io) {
        io.emit('config_updated', { categories, storeId });
    }
    
    res.json({ message: 'Configuration saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getConfig, saveConfig };
