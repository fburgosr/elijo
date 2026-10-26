// Servidor de Elijo: entrega la app, publica el contenido y protege el panel de administración.
const express = require('express');
const fs = require('fs');
const path = require('path');
const seg = require('./seguridad');

const PUERTO = process.env.PORT || 3000;
const SEMILLA = path.join(__dirname, 'contenido.inicial.json');
const ARCHIVO = path.join(seg.DATOS, 'contenido.json');
const COOKIE = 'elijo_sesion';

seg.asegurarDatos();
// En un hosting sin terminal, el primer administrador se crea con dos variables de entorno.
// Solo actúa si todavía no existe ninguno; después la clave se cambia desde el panel.
if (!seg.leerAdmin() && process.env.ELIJO_ADMIN_USUARIO && (process.env.ELIJO_ADMIN_CLAVE || '').length >= 10) {
  seg.guardarAdmin(process.env.ELIJO_ADMIN_USUARIO, process.env.ELIJO_ADMIN_CLAVE);
  console.log('Administrador inicial creado desde las variables de entorno.');
}
const semilla = JSON.parse(fs.readFileSync(SEMILLA, 'utf8'));
const leerContenido = () => {
  // Lo publicado antes de una actualización puede no tener las secciones nuevas: se completan con la semilla.
  try { return { ...semilla, ...JSON.parse(fs.readFileSync(ARCHIVO, 'utf8')) }; } catch (e) { return semilla; }
};

// ----- Validación del contenido que guarda la administración -----
const texto = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const enlace = v => typeof v === 'string' && /^https:\/\/\S+$/.test(v) && v.length <= 500;
function validar(c) {
  const e = [];
  if (!c || typeof c !== 'object') return ['El contenido no es válido.'];
  if (!texto(c.version, 30)) e.push('Falta la versión.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.fecha || '')) e.push('La fecha de revisión debe tener el formato AAAA-MM-DD.');
  const ids = semilla.metodos.map(m => m.id);
  if (!Array.isArray(c.metodos) || c.metodos.length !== ids.length || c.metodos.some((m, i) => !m || m.id !== ids[i])) {
    e.push('La lista de métodos no puede cambiar de tamaño ni de orden.');
  } else {
    c.metodos.forEach(m => {
      for (const k of ['nombre', 'apodo', 'dura']) if (!texto(m[k], 120)) e.push(`Método ${m.id}: revisa "${k}".`);
      for (const k of ['uso', 'lact', 'efectos']) if (!texto(m[k], 400)) e.push(`Método ${m.id}: revisa "${k}".`);
      if (typeof m.efic !== 'number' || m.efic < 0 || m.efic > 100) e.push(`Método ${m.id}: la eficacia debe ser un número de 0 a 100.`);
    });
  }
  const lista = (nombre, arr, max, f) => {
    if (!Array.isArray(arr) || arr.length > max) return e.push(`Revisa la lista de ${nombre}.`);
    arr.forEach((x, i) => { if (!x || !f(x)) e.push(`${nombre}: revisa el elemento ${i + 1}.`); });
  };
  lista('mitos', c.mitos, 40, m => texto(m.q, 200) && texto(m.r, 500) && texto(m.f, 120) && typeof m.v === 'boolean');
  lista('dudas y temores', c.temores, 40, t => texto(t.q, 200) && texto(t.r, 500) && texto(t.f, 120));
  lista('videos', c.videos, 60, v => texto(v.t, 80) && enlace(v.url) && (v.m === '' || ids.includes(v.m)));
  lista('señales de alarma', c.alarmas, 20, a => texto(a, 160));
  lista('datos para pacientes', c.datos, 30, d => texto(d.t, 240) && texto(d.f, 120));
  lista('historias', c.historias, 30, h => texto(h.nombre, 60) && texto(h.texto, 600));
  lista('consejos para la pareja', c.pareja, 15, x => texto(x, 240));
  lista('referencias', c.refs, 60, r => Array.isArray(r) && texto(r[0], 400) && enlace(r[1]));
  return e;
}
// Solo se guardan los campos conocidos; las reglas clínicas (hormonal, combinado, tags) vienen siempre de la semilla.
function normalizar(c) {
  return {
    version: c.version.trim(), fecha: c.fecha,
    metodos: c.metodos.map((m, i) => ({
      ...semilla.metodos[i], activo: !!m.activo, msp: !!m.msp, efic: m.efic,
      nombre: m.nombre, apodo: m.apodo, dura: m.dura, uso: m.uso, lact: m.lact, efectos: m.efectos
    })),
    mitos: c.mitos.map(m => ({ q: m.q, v: m.v, r: m.r, f: m.f, activo: m.activo !== false })),
    temores: c.temores.map(t => ({ q: t.q, r: t.r, f: t.f, activo: t.activo !== false })),
    videos: c.videos.map(v => ({ t: v.t, url: v.url, m: v.m })),
    alarmas: c.alarmas.map(a => a.trim()),
    datos: c.datos.map(d => ({ t: d.t, f: d.f })),
    historias: c.historias.map(h => ({ nombre: h.nombre, texto: h.texto })),
    pareja: c.pareja.map(x => x.trim()),
    refs: c.refs.map(r => [r[0], r[1]])
  };
}

// ----- Servidor -----
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '300kb' }));
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; frame-ancestors 'none'"
  });
  next();
});

const cookies = req => Object.fromEntries((req.headers.cookie || '').split(';').map(p => p.trim().split('=')).filter(p => p.length === 2));
const sesion = req => seg.leerSesion(cookies(req)[COOKIE]);
const ponerCookie = (req, res, valor, segundos) => res.set('Set-Cookie',
  `${COOKIE}=${valor}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${segundos}${req.secure ? '; Secure' : ''}`);
function soloAdmin(req, res, next) {
  // La cabecera propia impide que otra página envíe la petición en nombre de la administradora.
  if (req.get('X-Requested-With') !== 'elijo') return res.status(400).json({ error: 'Petición no válida.' });
  if (!sesion(req)) return res.status(401).json({ error: 'Inicia sesión para continuar.' });
  next();
}

const intentos = new Map();
function frenar(req, res, next) {
  const ahora = Date.now(), r = intentos.get(req.ip) || { n: 0, desde: ahora };
  if (ahora - r.desde > 15 * 60e3) { r.n = 0; r.desde = ahora; }
  if (r.n >= 5) return res.status(429).json({ error: 'Demasiados intentos. Espera 15 minutos.' });
  req.intento = r; intentos.set(req.ip, r);
  next();
}

app.get('/api/contenido', (req, res) => res.set('Cache-Control', 'no-store').json(leerContenido()));
app.get('/contenido.inicial.json', (req, res) => res.sendFile(SEMILLA));

app.post('/api/admin/entrar', frenar, (req, res) => {
  const { usuario, clave } = req.body || {};
  if (!seg.leerAdmin()) return res.status(503).json({ error: 'Aún no hay administrador. Ejecuta: npm run crear-admin' });
  if (!seg.verificar(usuario, clave)) { req.intento.n++; return res.status(401).json({ error: 'Usuario o clave incorrectos.' }); }
  req.intento.n = 0;
  ponerCookie(req, res, seg.crearSesion(usuario), seg.HORAS_SESION * 3600);
  res.json({ usuario });
});
app.post('/api/admin/salir', (req, res) => { ponerCookie(req, res, '', 0); res.json({}); });
app.get('/api/admin/sesion', (req, res) => {
  const s = sesion(req);
  s ? res.json({ usuario: s.u }) : res.status(401).json({ error: 'Sin sesión.' });
});
app.put('/api/admin/contenido', soloAdmin, (req, res) => {
  const errores = validar(req.body);
  if (errores.length) return res.status(400).json({ error: 'Hay datos por corregir.', errores });
  const nuevo = normalizar(req.body);
  if (fs.existsSync(ARCHIVO)) fs.copyFileSync(ARCHIVO, path.join(seg.DATOS, 'historial', `contenido-${Date.now()}.json`));
  fs.writeFileSync(ARCHIVO, JSON.stringify(nuevo, null, 1));
  res.json(nuevo);
});
app.post('/api/admin/restaurar', soloAdmin, (req, res) => {
  if (fs.existsSync(ARCHIVO)) fs.renameSync(ARCHIVO, path.join(seg.DATOS, 'historial', `contenido-${Date.now()}.json`));
  res.json(semilla);
});
app.post('/api/admin/clave', soloAdmin, frenar, (req, res) => {
  const { actual, nueva } = req.body || {};
  const s = sesion(req);
  if (!seg.verificar(s.u, actual)) { req.intento.n++; return res.status(401).json({ error: 'La clave actual no coincide.' }); }
  if (typeof nueva !== 'string' || nueva.length < 10 || nueva.length > 100) return res.status(400).json({ error: 'La clave nueva debe tener al menos 10 caracteres.' });
  seg.guardarAdmin(s.u, nueva);
  res.json({});
});

// ----- Registro anónimo: solo contadores por mes, sin datos de ninguna paciente -----
const ARCH_AJUSTES = path.join(seg.DATOS, 'ajustes.json');
const ARCH_REGISTRO = path.join(seg.DATOS, 'registro.json');
const leerJson = (f, def) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return def; } };
const OTROS_MOTIVOS = ['Otra razón', 'Prefiero no decir'];
const motivosValidos = () => leerContenido().temores.map(t => t.q).concat(OTROS_MOTIVOS);
function sumar(...ruta) {
  const r = leerJson(ARCH_REGISTRO, {});
  let o = r[new Date().toISOString().slice(0, 7)] ||= {};
  ruta.slice(0, -1).forEach(k => { o = o[k] ||= {}; });
  o[ruta.at(-1)] = (o[ruta.at(-1)] || 0) + 1;
  fs.writeFileSync(ARCH_REGISTRO, JSON.stringify(r, null, 1));
}
function limitar(max, minutos) {
  const vistos = new Map();
  return (req, res, next) => {
    const ahora = Date.now(), r = vistos.get(req.ip) || { n: 0, desde: ahora };
    if (ahora - r.desde > minutos * 60e3) { r.n = 0; r.desde = ahora; }
    if (++r.n > max) return res.status(429).json({ error: 'Demasiados envíos. Intenta más tarde.' });
    vistos.set(req.ip, r);
    next();
  };
}
// La paciente que decide no usar un método puede decir por qué. No se guarda nada más que el conteo.
app.post('/api/registro/motivo', limitar(30, 60), (req, res) => {
  const { motivo } = req.body || {};
  if (!motivosValidos().includes(motivo)) return res.status(400).json({ error: 'Motivo no válido.' });
  sumar('motivosPacientes', motivo);
  res.json({});
});
// La obstetra registra el resultado de cada consejería con el código del establecimiento.
app.post('/api/registro/consejeria', limitar(120, 60), (req, res) => {
  const { codigo, fase, metodo, motivo } = req.body || {};
  const esperado = leerJson(ARCH_AJUSTES, {}).codigo;
  if (!esperado || codigo !== esperado) return res.status(403).json({ error: 'El código del establecimiento no es correcto.' });
  if (!['base', 'app'].includes(fase)) return res.status(400).json({ error: 'Indica si es línea de base o uso con la app.' });
  if (metodo === 'ninguno') {
    if (!motivosValidos().includes(motivo)) return res.status(400).json({ error: 'Elige el motivo.' });
    sumar(fase, 'sinMetodo', motivo);
  } else if (semilla.metodos.some(m => m.id === metodo)) {
    sumar(fase, 'conMetodo', metodo);
  } else return res.status(400).json({ error: 'Método no válido.' });
  res.json({});
});
app.get('/api/admin/registro', soloAdmin, (req, res) => res.json({ registro: leerJson(ARCH_REGISTRO, {}), codigoDefinido: !!leerJson(ARCH_AJUSTES, {}).codigo }));
app.put('/api/admin/codigo', soloAdmin, (req, res) => {
  const { codigo } = req.body || {};
  if (typeof codigo !== 'string' || codigo.length < 4 || codigo.length > 20) return res.status(400).json({ error: 'El código debe tener de 4 a 20 caracteres.' });
  fs.writeFileSync(ARCH_AJUSTES, JSON.stringify({ ...leerJson(ARCH_AJUSTES, {}), codigo }, null, 1));
  res.json({});
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

app.listen(PUERTO, () => {
  console.log(`Elijo en http://localhost:${PUERTO}`);
  if (!seg.leerAdmin()) console.log('Aún no hay administrador. Ejecuta: npm run crear-admin');
});
