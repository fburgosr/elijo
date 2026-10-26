// Crea o reemplaza el usuario administrador y muestra su clave una sola vez.
// Uso: npm run crear-admin -- <usuario>
const crypto = require('crypto');
const { guardarAdmin } = require('../seguridad');

const usuario = process.argv[2] || 'admin';
if (!/^[a-z0-9._-]{3,32}$/i.test(usuario)) {
  console.error('El usuario debe tener de 3 a 32 letras, números, puntos o guiones.');
  process.exit(1);
}
// ELIJO_CLAVE permite fijar la clave en pruebas automáticas; en uso normal se genera una al azar.
const clave = process.env.ELIJO_CLAVE || crypto.randomBytes(12).toString('base64url');
guardarAdmin(usuario, clave);
console.log('Administrador creado.');
console.log('  Usuario: ' + usuario);
if (!process.env.ELIJO_CLAVE) console.log('  Clave:   ' + clave);
console.log('Guarda la clave ahora: no se vuelve a mostrar. Puedes cambiarla desde el panel.');
