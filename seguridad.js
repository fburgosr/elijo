// Claves y sesiones del panel de administración. Solo usa el módulo crypto de Node.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATOS = process.env.DATA_DIR || path.join(__dirname, 'data');
const ARCHIVO_ADMIN = path.join(DATOS, 'admin.json');
const ARCHIVO_SECRETO = path.join(DATOS, 'secreto.txt');
const HORAS_SESION = 8;

function asegurarDatos() {
  fs.mkdirSync(path.join(DATOS, 'historial'), { recursive: true });
}

function hashClave(clave, sal = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(clave, sal, 64).toString('hex');
  return { sal, hash };
}

function guardarAdmin(usuario, clave) {
  asegurarDatos();
  fs.writeFileSync(ARCHIVO_ADMIN, JSON.stringify({ usuario, ...hashClave(clave) }, null, 1), { mode: 0o600 });
}

function leerAdmin() {
  try { return JSON.parse(fs.readFileSync(ARCHIVO_ADMIN, 'utf8')); } catch (e) { return null; }
}

function verificar(usuario, clave) {
  const admin = leerAdmin();
  if (!admin || typeof usuario !== 'string' || typeof clave !== 'string') return false;
  const { hash } = hashClave(clave, admin.sal);
  const iguales = crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(admin.hash, 'hex'));
  return iguales && usuario === admin.usuario;
}

function secreto() {
  asegurarDatos();
  if (!fs.existsSync(ARCHIVO_SECRETO)) fs.writeFileSync(ARCHIVO_SECRETO, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  return fs.readFileSync(ARCHIVO_SECRETO, 'utf8');
}

const firmar = cuerpo => crypto.createHmac('sha256', secreto()).update(cuerpo).digest('base64url');

function crearSesion(usuario) {
  const cuerpo = Buffer.from(JSON.stringify({ u: usuario, exp: Date.now() + HORAS_SESION * 3600e3 })).toString('base64url');
  return cuerpo + '.' + firmar(cuerpo);
}

function leerSesion(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [cuerpo, firma] = token.split('.');
  const esperada = firmar(cuerpo);
  if (firma.length !== esperada.length || !crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))) return null;
  try {
    const s = JSON.parse(Buffer.from(cuerpo, 'base64url').toString());
    const admin = leerAdmin();
    return s.exp > Date.now() && admin && s.u === admin.usuario ? s : null;
  } catch (e) { return null; }
}

module.exports = { DATOS, HORAS_SESION, asegurarDatos, guardarAdmin, leerAdmin, verificar, crearSesion, leerSesion };
