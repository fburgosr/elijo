// Prueba de extremo a extremo del servidor con datos temporales. Uso: node herramientas/probar.js
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const raiz = path.join(__dirname, '..');
const datos = fs.mkdtempSync(path.join(os.tmpdir(), 'elijo-prueba-'));
const clave = crypto.randomBytes(9).toString('base64url');
const env = { ...process.env, DATA_DIR: datos, PORT: '3111', ELIJO_CLAVE: clave };
const base = 'http://localhost:3111';
let fallos = 0;
const ok = (nombre, cond) => { console.log((cond ? 'ok   ' : 'FALLA ') + nombre); if (!cond) fallos++; };

(async () => {
  // Primero, configuración inicial desde el navegador (sin administradora, con código).
  const envSetup = { ...env, ELIJO_SETUP_TOKEN: 'codigo-de-prueba-123', PORT: '3112' };
  const srvSetup = spawn('node', [path.join(raiz, 'server.js')], { env: envSetup, stdio: 'ignore' });
  try {
    for (let i = 0; i < 40; i++) { try { await fetch('http://localhost:3112/api/admin/estado'); break; } catch (e) { await new Promise(r => setTimeout(r, 150)); } }
    const J0 = { 'Content-Type': 'application/json', 'X-Requested-With': 'elijo' };
    const est = await (await fetch('http://localhost:3112/api/admin/estado')).json();
    ok('sin administradora y con código, la configuración inicial está disponible', est.hayAdmin === false && est.configurar === true);
    ok('código incorrecto se rechaza', (await fetch('http://localhost:3112/api/admin/configurar', { method: 'POST', headers: J0, body: JSON.stringify({ token: 'otro', usuario: 'ana', clave: 'clave-larga-123' }) })).status === 401);
    ok('clave corta se rechaza', (await fetch('http://localhost:3112/api/admin/configurar', { method: 'POST', headers: J0, body: JSON.stringify({ token: 'codigo-de-prueba-123', usuario: 'ana', clave: 'corta' }) })).status === 400);
    ok('con el código se crea la administradora', (await fetch('http://localhost:3112/api/admin/configurar', { method: 'POST', headers: J0, body: JSON.stringify({ token: 'codigo-de-prueba-123', usuario: 'ana', clave: 'clave-larga-123' }) })).status === 200);
    ok('ya creada, la configuración inicial se cierra', (await (await fetch('http://localhost:3112/api/admin/estado')).json()).configurar === false);
  } finally { srvSetup.kill(); }
  fs.rmSync(path.join(datos, 'admin.json'), { force: true });
  execFileSync('node', [path.join(raiz, 'herramientas', 'crear-admin.js'), 'prueba'], { env, stdio: 'ignore' });
  const srv = spawn('node', [path.join(raiz, 'server.js')], { env, stdio: 'ignore' });
  try {
    for (let i = 0; i < 40; i++) { try { await fetch(base + '/api/contenido'); break; } catch (e) { await new Promise(r => setTimeout(r, 150)); } }
    const J = { 'Content-Type': 'application/json', 'X-Requested-With': 'elijo' };
    const c = await (await fetch(base + '/api/contenido')).json();
    ok('contenido público con 10 métodos', c.metodos.length === 10);
    ok('MELA desactivado al inicio', c.metodos.find(m => m.id === 'mela').activo === false);
    ok('la app carga', (await fetch(base + '/')).status === 200 && (await fetch(base + '/app.js')).status === 200);
    ok('el panel carga', (await fetch(base + '/admin')).status === 200);
    ok('guardar sin sesión se rechaza', (await fetch(base + '/api/admin/contenido', { method: 'PUT', headers: J, body: JSON.stringify(c) })).status === 401);
    ok('clave incorrecta se rechaza', (await fetch(base + '/api/admin/entrar', { method: 'POST', headers: J, body: JSON.stringify({ usuario: 'prueba', clave: 'incorrecta' }) })).status === 401);
    const entrar = await fetch(base + '/api/admin/entrar', { method: 'POST', headers: J, body: JSON.stringify({ usuario: 'prueba', clave }) });
    const cookie = (entrar.headers.get('set-cookie') || '').split(';')[0];
    ok('entrar con la clave correcta', entrar.status === 200 && cookie.startsWith('elijo_sesion='));
    const A = { ...J, Cookie: cookie };
    ok('sin la cabecera propia se rechaza', (await fetch(base + '/api/admin/contenido', { method: 'PUT', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify(c) })).status === 400);
    const malo = JSON.parse(JSON.stringify(c)); malo.videos.push({ t: 'x', url: 'http://sin-https', m: '' });
    ok('video sin https se rechaza', (await fetch(base + '/api/admin/contenido', { method: 'PUT', headers: A, body: JSON.stringify(malo) })).status === 400);
    const nuevo = JSON.parse(JSON.stringify(c));
    nuevo.metodos.find(m => m.id === 'mela').activo = true; nuevo.metodos[0].hormonal = false; nuevo.version = '1.1';
    nuevo.videos.push({ t: 'Implante', url: 'https://example.org/v', m: 'implante' });
    ok('guardar con sesión', (await fetch(base + '/api/admin/contenido', { method: 'PUT', headers: A, body: JSON.stringify(nuevo) })).status === 200);
    const c2 = await (await fetch(base + '/api/contenido')).json();
    ok('el cambio se publica', c2.version === '1.1' && c2.metodos.find(m => m.id === 'mela').activo && c2.videos.length === 1);
    ok('las reglas clínicas no se pueden alterar', c2.metodos[0].hormonal === true);
    ok('restaurar contenido inicial', (await fetch(base + '/api/admin/restaurar', { method: 'POST', headers: A })).status === 200 && (await (await fetch(base + '/api/contenido')).json()).version === c.version);
    ok('la semilla trae datos y consejos para la pareja', c.datos.length >= 3 && c.pareja.length >= 3 && Array.isArray(c.historias));
    const conHistoria = JSON.parse(JSON.stringify(c)); conHistoria.historias.push({ nombre: 'Prueba', texto: 'Texto de prueba' });
    ok('se publica una historia', (await fetch(base + '/api/admin/contenido', { method: 'PUT', headers: A, body: JSON.stringify(conHistoria) })).status === 200 && (await (await fetch(base + '/api/contenido')).json()).historias.length === 1);
    const P = { 'Content-Type': 'application/json' };
    const motivo = c.temores[0].q;
    ok('motivo de paciente se cuenta', (await fetch(base + '/api/registro/motivo', { method: 'POST', headers: P, body: JSON.stringify({ motivo }) })).status === 200);
    ok('motivo inventado se rechaza', (await fetch(base + '/api/registro/motivo', { method: 'POST', headers: P, body: JSON.stringify({ motivo: '__proto__' }) })).status === 400);
    const cons = cuerpo => fetch(base + '/api/registro/consejeria', { method: 'POST', headers: P, body: JSON.stringify(cuerpo) });
    ok('consejería sin código definido se rechaza', (await cons({ codigo: 'x', fase: 'base', metodo: 'implante' })).status === 403);
    ok('definir el código del establecimiento', (await fetch(base + '/api/admin/codigo', { method: 'PUT', headers: A, body: JSON.stringify({ codigo: 'centro-01' }) })).status === 200);
    ok('consejería con código incorrecto se rechaza', (await cons({ codigo: 'otro', fase: 'base', metodo: 'implante' })).status === 403);
    ok('consejería con método se registra', (await cons({ codigo: 'centro-01', fase: 'base', metodo: 'implante' })).status === 200);
    ok('consejería sin método pide motivo', (await cons({ codigo: 'centro-01', fase: 'app', metodo: 'ninguno' })).status === 400);
    ok('consejería sin método se registra', (await cons({ codigo: 'centro-01', fase: 'app', metodo: 'ninguno', motivo })).status === 200);
    const reg = (await (await fetch(base + '/api/admin/registro', { headers: A })).json()).registro;
    const mes = Object.keys(reg)[0];
    ok('el panel ve los conteos', reg[mes].base.conMetodo.implante === 1 && reg[mes].app.sinMetodo[motivo] === 1 && reg[mes].motivosPacientes[motivo] === 1);
    ok('el registro no es público', (await fetch(base + '/api/admin/registro', { headers: P })).status === 400);
    const clave2 = crypto.randomBytes(9).toString('base64url');
    ok('cambiar la clave', (await fetch(base + '/api/admin/clave', { method: 'POST', headers: A, body: JSON.stringify({ actual: clave, nueva: clave2 }) })).status === 200);
    ok('la clave anterior deja de servir', (await fetch(base + '/api/admin/entrar', { method: 'POST', headers: J, body: JSON.stringify({ usuario: 'prueba', clave }) })).status === 401);
  } finally {
    srv.kill();
    fs.rmSync(datos, { recursive: true, force: true });
  }
  console.log(fallos ? fallos + ' prueba(s) fallaron' : 'Todas las pruebas pasaron');
  process.exit(fallos ? 1 : 0);
})();
