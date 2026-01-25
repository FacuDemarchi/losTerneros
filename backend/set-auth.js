const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
const args = process.argv.slice(2);

function showHelp() {
    console.log('\nUso: npm run set-auth <rol> <contraseña>');
    console.log('Ejemplos:');
    console.log('  npm run set-auth master "mi_clave_secreta"');
    console.log('  npm run set-auth admin "otra_clave"');
    console.log('\nRoles válidos: master, admin');
}

if (args.length < 2) {
    showHelp();
    process.exit(1);
}

const roleInput = args[0].toLowerCase();
const password = args[1];

let keyToUpdate;
if (['master', '-m', '--master'].includes(roleInput)) {
    keyToUpdate = 'MASTER_HASH';
} else if (['admin', '-a', '--admin'].includes(roleInput)) {
    keyToUpdate = 'ADMIN_HASH';
} else {
    console.error(`\n❌ Error: Rol "${roleInput}" no reconocido.`);
    showHelp();
    process.exit(1);
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

    console.log(`\n✅ Contraseña de ${roleInput.toUpperCase()} actualizada con éxito.`);
    console.log(`🔑 Nuevo Hash generado: ${hash.substring(0, 10)}...`);
    console.log('⚠️  IMPORTANTE: Reinicia el servidor backend para aplicar los cambios.');

} catch (error) {
    console.error('❌ Error al escribir en .env:', error.message);
    process.exit(1);
}
