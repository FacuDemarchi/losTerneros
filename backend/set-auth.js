const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
const args = process.argv.slice(2);

function showHelp() {
    console.log('\nUso: npm run set-auth <rol> <contraseña>');
    console.log('       npm run set-auth newRol <nuevo_rol> <contraseña>');
    console.log('Ejemplos:');
    console.log('  npm run set-auth master "mi_clave_secreta"');
    console.log('  npm run set-auth admin "otra_clave"');
    console.log('  npm run set-auth newRol supervisor "clave_super"');
    console.log('\nRoles válidos: master, admin, o cualquier nuevo rol con newRol');
}

if (args.length < 2) {
    showHelp();
    process.exit(1);
}

let roleInput = args[0].toLowerCase();
let password = args[1];

// Manejo de comando "newRol" y "cashier"
if (roleInput === 'newrol') {
    if (args.length < 3) {
        console.error('\n❌ Error: Para crear un nuevo rol se requieren 3 argumentos.');
        console.log('Uso: npm run set-auth newRol <nombre_rol> <contraseña>');
        process.exit(1);
    }
    roleInput = args[1].toLowerCase();
    password = args[2];
    keyToUpdate = `${roleInput.toUpperCase()}_HASH`;
} else if (roleInput === 'cashier') {
    if (args.length < 3) {
        console.error('\n❌ Error: Para crear un cajero se requieren 3 argumentos.');
        console.log('Uso: npm run set-auth cashier <nombre_cajero> <contraseña>');
        process.exit(1);
    }
    const cashierName = args[1].toUpperCase();
    password = args[2];
    keyToUpdate = `CASHIER_HASH_${cashierName}`;
} else if (['master', '-m', '--master'].includes(roleInput)) {
    keyToUpdate = 'MASTER_HASH';
} else if (['admin', '-a', '--admin'].includes(roleInput)) {
    keyToUpdate = 'ADMIN_HASH';
} else {
    // Para roles personalizados, usamos el nombre en mayúsculas + _HASH
    keyToUpdate = `${roleInput.toUpperCase()}_HASH`;
}

if (!password) {
    console.error('\n❌ Error: Debes proporcionar una contraseña.');
    showHelp();
    process.exit(1);
}

// Generar Hash SHA-256
const hash = crypto.createHash('sha256').update(password).digest('hex');

try {
    if (!fs.existsSync(envPath)) {
        console.error('Error: No se encuentra el archivo .env en ' + envPath);
        process.exit(1);
    }

    let envContent = fs.readFileSync(envPath, 'utf8');
    const regex = new RegExp(`^${keyToUpdate}=.*`, 'm');

    if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${keyToUpdate}=${hash}`);
        console.log(`📝 Actualizando línea existente para ${keyToUpdate}...`);
    } else {
        // Asegurar que haya un salto de línea antes de agregar
        const prefix = envContent.endsWith('\n') ? '' : '\n';
        envContent += `${prefix}${keyToUpdate}=${hash}`;
        console.log(`➕ Agregando nueva línea para ${keyToUpdate}...`);
    }

    fs.writeFileSync(envPath, envContent);

    // Actualizar passwords.txt
    const passwordsPath = path.resolve(__dirname, 'passwords.txt');
    let passwordsContent = '';
    if (fs.existsSync(passwordsPath)) {
        passwordsContent = fs.readFileSync(passwordsPath, 'utf8');
    }

    // Usamos el mismo nombre de clave que en .env (XXX_HASH) para facilitar copiar a Render
    
    // 1. Limpiar versiones antiguas que guardaban la contraseña cruda (_PASSWORD)
    const legacyKey = keyToUpdate.replace('_HASH', '_PASSWORD');
    const legacyRegex = new RegExp(`^${legacyKey}=.*[\r\n]*`, 'm');
    if (legacyRegex.test(passwordsContent)) {
        passwordsContent = passwordsContent.replace(legacyRegex, '');
        console.log(`🗑️  Eliminando contraseña cruda antigua (${legacyKey}) de passwords.txt...`);
    }

    // 2. Guardar o actualizar el HASH
    const passwordRegex = new RegExp(`^${keyToUpdate}=.*`, 'm');

    if (passwordRegex.test(passwordsContent)) {
        passwordsContent = passwordsContent.replace(passwordRegex, `${keyToUpdate}=${hash}`);
        console.log(`📝 Actualizando hash en passwords.txt para ${keyToUpdate}...`);
    } else {
        // Asegurar formato limpio (sin líneas en blanco extra al final antes de agregar)
        passwordsContent = passwordsContent.trim();
        const prefix = passwordsContent === '' ? '' : '\n';
        passwordsContent += `${prefix}${keyToUpdate}=${hash}\n`;
        console.log(`➕ Agregando hash a passwords.txt para ${keyToUpdate}...`);
    }

    fs.writeFileSync(passwordsPath, passwordsContent);
    console.log(`🔒 Hash guardado en ${passwordsPath} (listo para copiar a variables de entorno de Render)`);

    console.log(`\n✅ Contraseña de ${roleInput.toUpperCase()} actualizada con éxito.`);
    console.log(`🔑 Nuevo Hash generado: ${hash.substring(0, 10)}...`);
    console.log('⚠️  IMPORTANTE: Reinicia el servidor backend para aplicar los cambios.');

} catch (error) {
    console.error('❌ Error al escribir en .env:', error.message);
    process.exit(1);
}
