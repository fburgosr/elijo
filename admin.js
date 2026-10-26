/* Panel de administración de Elijo: edita el contenido que ven las pacientes. Las reglas clínicas no se editan aquí. */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let C = null, R = {registro: {}, centros: []}, usuario = null, sucio = false, errores = [];

async function api(metodo, ruta, cuerpo) {
  const r = await fetch(ruta, {method: metodo, headers: {'Content-Type': 'application/json', 'X-Requested-With': 'elijo'}, body: cuerpo ? JSON.stringify(cuerpo) : undefined});
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(datos.error || 'No se pudo completar la acción.'), {errores: datos.errores || [], estado: r.status});
  return datos;
}
let tt; function toast(t) { const e = $('#toast'); e.textContent = t; e.hidden = false; clearTimeout(tt); tt = setTimeout(() => e.hidden = true, 2600); }

/* ----- Campos enlazados al contenido por su ruta, por ejemplo "metodos.3.nombre" ----- */
const leer = ruta => ruta.split('.').reduce((o, k) => o[k], C);
function escribir(ruta, valor) { const ks = ruta.split('.'), ult = ks.pop(); ks.reduce((o, k) => o[k], C)[ult] = valor; }
const campo = (ruta, etiqueta, max) => `<label>${etiqueta}<input type="text" data-ruta="${ruta}" maxlength="${max}" value="${esc(leer(ruta))}"></label>`;
const area = (ruta, etiqueta, max) => `<label>${etiqueta}<textarea data-ruta="${ruta}" maxlength="${max}">${esc(leer(ruta))}</textarea></label>`;
const marca = (ruta, etiqueta) => `<label class="marca"><input type="checkbox" data-ruta="${ruta}"${leer(ruta) !== false && leer(ruta) ? ' checked' : ''}>${etiqueta}</label>`;
const seccion = (titulo, cuerpo, abierta) => `<details class="panel"${abierta ? ' open' : ''}><summary>${titulo}</summary><div class="stack">${cuerpo}</div></details>`;


/* ----- Registro anónimo de consejerías: conteos por mes ----- */
const total = o => Object.values(o || {}).reduce((a, b) => a + b, 0);
const nombreCentro = id => { const c = R.centros.find(x => x.id === id); return c ? c.nombre : (id === 'base' || id === 'app' ? 'Sin centro' : id); };
// Por cada mes: los conteos de cada centro (clave = id del centro). "base"/"app" sueltos son datos de la versión de un solo código.
function centrosDelMes(m) {
  const out = [];
  for (const [k, v] of Object.entries(m)) {
    if (k === 'motivosPacientes') continue;
    if (k === 'base' || k === 'app') { let s = out.find(x => x.id === 'sin-centro'); if (!s) { s = {id: 'sin-centro', nombre: 'Sin centro', fases: {}}; out.push(s); } s.fases[k] = v; }
    else out.push({id: k, nombre: nombreCentro(k), fases: v || {}});
  }
  return out;
}
function filasRegistro() {
  return Object.keys(R.registro).sort().reverse().map(mes => centrosDelMes(R.registro[mes]).map(c => ['base', 'app'].map(fase => {
    const f = c.fases[fase]; if (!f) return '';
    const con = total(f.conMetodo), sin = total(f.sinMetodo), n = con + sin;
    return `<tr><td>${mes}</td><td>${esc(c.nombre)}</td><td>${fase === 'base' ? 'Línea de base' : 'Con la app'}</td><td class="c">${n}</td><td class="c">${con}</td><td class="c">${n ? Math.round(con / n * 100) + ' %' : ''}</td></tr>`;
  }).join('')).join('')).join('');
}
function csvRegistro() {
  const lineas = ['mes,centro,origen,resultado,detalle,cantidad'], q = s => '"' + String(s).replace(/"/g, '""') + '"';
  for (const mes of Object.keys(R.registro).sort()) {
    const m = R.registro[mes];
    for (const c of centrosDelMes(m)) for (const fase of ['base', 'app']) for (const res of ['conMetodo', 'sinMetodo'])
      for (const [k, n] of Object.entries((c.fases[fase] || {})[res] || {})) lineas.push([mes, q(c.nombre), fase, res, q(k), n].join(','));
    for (const [k, n] of Object.entries(m.motivosPacientes || {})) lineas.push([mes, '', 'paciente', 'motivoNoUso', q(k), n].join(','));
  }
  return lineas.join('\n');
}
/* ----- Estadísticas: se calculan en el navegador a partir de los conteos ----- */
let E = {centro: '', mes: ''};
const nombreMetodo = id => { const m = (C.metodos || []).find(x => x.id === id); return m ? m.nombre : id; };
function datosEstadisticas() {
  const d = {base: {n: 0, con: 0}, app: {n: 0, con: 0}, metodos: {}, motivosObst: {}, motivosPac: {}, meses: {}};
  for (const mes of Object.keys(R.registro)) {
    if (E.mes && mes !== E.mes) continue;
    const m = R.registro[mes];
    for (const c of centrosDelMes(m)) {
      if (E.centro && c.id !== E.centro) continue;
      for (const fase of ['base', 'app']) {
        const f = c.fases[fase]; if (!f) continue;
        const con = total(f.conMetodo), sin = total(f.sinMetodo);
        d[fase].n += con + sin; d[fase].con += con;
        const k = mes + '|' + c.nombre; d.meses[k] = d.meses[k] || {mes, centro: c.nombre, base: {n: 0, con: 0}, app: {n: 0, con: 0}};
        d.meses[k][fase].n += con + sin; d.meses[k][fase].con += con;
        for (const [id, n] of Object.entries(f.conMetodo || {})) d.metodos[id] = (d.metodos[id] || 0) + n;
        for (const [k2, n] of Object.entries(f.sinMetodo || {})) d.motivosObst[k2] = (d.motivosObst[k2] || 0) + n;
      }
    }
    if (!E.centro) for (const [k, n] of Object.entries(m.motivosPacientes || {})) d.motivosPac[k] = (d.motivosPac[k] || 0) + n;
  }
  return d;
}
const pct = (a, b) => b ? Math.round(a / b * 100) + ' %' : '—';
function barras(obj, nombre) {
  const filas = Object.entries(obj).sort((a, b) => b[1] - a[1]); const max = filas.length ? filas[0][1] : 1; const tot = filas.reduce((s, x) => s + x[1], 0);
  return filas.length ? `<div class="est">${filas.map(([k, n]) => `<div class="fila"><span class="small">${esc(nombre(k))}</span><div class="pista"><div class="b" style="width:${Math.round(n / max * 100)}%"></div></div><span class="small"><b>${n}</b> (${pct(n, tot)})</span></div>`).join('')}</div>` : '<p class="muted small">Sin datos para este filtro.</p>';
}
function vistaEstadisticas() {
  const d = datosEstadisticas(), meses = Object.keys(R.registro).sort().reverse();
  const n = d.base.n + d.app.n, con = d.base.con + d.app.con;
  const filas = Object.values(d.meses).sort((a, b) => b.mes.localeCompare(a.mes) || a.centro.localeCompare(b.centro));
  const dif = d.base.n && d.app.n ? Math.round(d.app.con / d.app.n * 100) - Math.round(d.base.con / d.base.n * 100) : null;
  return `<p class="small muted">Producción y resultado de la consejería según lo que registran las obstetras. Solo cuenta lo registrado; una consejería sin registro no aparece.</p>
    <div class="rejilla"><label>Centro<select data-est="centro"><option value="">Todos los centros</option>${R.centros.map(c => `<option value="${esc(c.id)}"${E.centro === c.id ? ' selected' : ''}>${esc(c.nombre)}</option>`).join('')}</select></label>
    <label>Mes<select data-est="mes"><option value="">Todos los meses</option>${meses.map(m => `<option value="${m}"${E.mes === m ? ' selected' : ''}>${m}</option>`).join('')}</select></label></div>
    <div class="tiles"><div class="tile"><b>${n}</b>consejerías registradas</div><div class="tile"><b>${con}</b>salieron con método (${pct(con, n)})</div><div class="tile"><b>${pct(d.base.con, d.base.n)}</b>aceptación en línea de base (${d.base.n})</div><div class="tile"><b>${pct(d.app.con, d.app.n)}</b>aceptación con la app (${d.app.n})${dif === null ? '' : `<span class="small muted">${dif >= 0 ? '+' : ''}${dif} puntos frente a la línea de base</span>`}</div></div>
    <h3>Por mes y centro</h3>
    ${filas.length ? `<div class="tablewrap"><table><thead><tr><th>Mes</th><th>Centro</th><th>Línea de base</th><th>Aceptación</th><th>Con la app</th><th>Aceptación</th></tr></thead><tbody>${filas.map(f => `<tr><td>${f.mes}</td><td>${esc(f.centro)}</td><td class="c">${f.base.con} / ${f.base.n}</td><td class="c">${pct(f.base.con, f.base.n)}</td><td class="c">${f.app.con} / ${f.app.n}</td><td class="c">${pct(f.app.con, f.app.n)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small">Aún no hay registros.</p>'}
    <h3>Métodos elegidos</h3>${barras(d.metodos, nombreMetodo)}
    <h3>Motivos de quienes no aceptaron un método (registrados por la obstetra)</h3>${barras(d.motivosObst, x => x)}
    <h3>Motivos que dieron las pacientes en la app</h3>${E.centro ? '<p class="muted small">Las respuestas de las pacientes no llevan centro; quita el filtro de centro para verlas.</p>' : barras(d.motivosPac, x => x)}
    <div class="row"><button class="btn quiet" data-act="actualizarregistro">Actualizar conteos</button><button class="btn quiet" data-act="copiarcsv">Copiar datos (CSV)</button></div>`;
}
function recogerCentros() {
  R.centros = [...document.querySelectorAll('[data-centro]')].map(f => ({id: f.dataset.centro, nombre: f.querySelector('.c-nombre').value.trim(), codigo: f.querySelector('.c-codigo').value.trim()}));
}
function vistaRegistro() {
  const motivos = {};
  for (const m of Object.values(R.registro)) for (const [k, n] of Object.entries(m.motivosPacientes || {})) motivos[k] = (motivos[k] || 0) + n;
  const top = Object.entries(motivos).sort((a, b) => b[1] - a[1]);
  return `<p class="small muted">Solo se guardan conteos por mes. No hay nombres, cédulas ni respuestas individuales.</p>
    <h3>Centros de salud y sus códigos</h3>
    <p class="small muted">Cada centro tiene su propio código; las obstetras de ese centro lo escriben una vez en Modo obstetra → Registro, y sus consejerías se cuentan aparte. El código: de 4 a 20 caracteres, sin espacios.</p>
    ${R.centros.length ? R.centros.map((c, i) => `<div class="item" data-centro="${esc(c.id || '')}"><div class="rejilla"><label>Centro de salud<input type="text" class="c-nombre" maxlength="60" value="${esc(c.nombre)}"></label><label>Código<input type="text" class="c-codigo" maxlength="20" autocomplete="off" value="${esc(c.codigo)}"></label></div><div class="row"><button class="link" data-quitarcentro="${i}">Quitar</button></div></div>`).join('') : '<p class="errores">Aún no hay centros. Sin un código, las obstetras no pueden registrar consejerías.</p>'}
    <div class="row"><button class="btn quiet" data-act="agregarcentro">Añadir centro</button><button class="btn" data-act="guardarcentros">Guardar centros</button><button class="btn quiet" data-act="actualizarregistro">Actualizar conteos</button></div>
    <h3>Pacientes que salen con un método</h3>
    <p class="small muted">Los conteos se cargan al abrir el panel; usa "Actualizar conteos" para ver los registros más recientes.</p>
    ${filasRegistro() ? `<div class="tablewrap"><table><thead><tr><th>Mes</th><th>Centro</th><th>Origen</th><th>Consejerías</th><th>Con método</th><th>Aceptación</th></tr></thead><tbody>${filasRegistro()}</tbody></table></div>` : '<p class="muted small">Aún no hay registros.</p>'}
    <h3>Por qué algunas pacientes no quieren un método</h3>
    ${top.length ? `<ul class="plain">${top.map(([k, n]) => `<li>${esc(k)}: <b>${n}</b></li>`).join('')}</ul>` : '<p class="muted small">Aún no hay respuestas.</p>'}
    <label>Datos para copiar a una hoja de cálculo (CSV)<textarea rows="5" readonly>${esc(csvRegistro())}</textarea></label>`;
}

function vistaConfigurar(mensaje) {
  $('#admin').innerHTML = `<form class="panel stack entrada" id="f-configurar"><span class="brand">Elijo</span><h2>Configuración inicial</h2>
    <p class="small muted">Aún no hay administradora. Crea tu usuario y tu clave. El código de configuración lo define quien instaló la app.</p>
    ${mensaje ? `<p class="errores">${esc(mensaje)}</p>` : ''}
    <label>Código de configuración<input type="text" id="s-token" autocomplete="off" required></label>
    <label>Usuario<input type="text" id="s-usuario" autocomplete="username" required></label>
    <label>Clave (mínimo 10 caracteres)<input type="password" id="s-clave" autocomplete="new-password" minlength="10" required></label>
    <label>Repite la clave<input type="password" id="s-clave2" autocomplete="new-password" minlength="10" required></label>
    <button class="btn wide" type="submit">Crear administradora</button></form>`;
}
function vistaEntrada(mensaje) {
  $('#admin').innerHTML = `<form class="panel stack entrada" id="f-entrar"><span class="brand">Elijo</span><h2>Administración</h2>
    ${mensaje ? `<p class="errores">${esc(mensaje)}</p>` : ''}
    <label>Usuario<input type="text" id="e-usuario" autocomplete="username" required></label>
    <label>Clave<input type="password" id="e-clave" autocomplete="current-password" required></label>
    <button class="btn wide" type="submit">Entrar</button>
    <a class="link" href="/">Volver a la app</a></form>`;
}

function vistaPanel() {
  const metodos = C.metodos.map((m, i) => `<div class="item"><h3>${esc(m.nombre)}</h3>
    <div class="row">${marca(`metodos.${i}.activo`, 'Visible en la app')}${marca(`metodos.${i}.msp`, 'Gratis en el MSP')}</div>
    <div class="rejilla">${campo(`metodos.${i}.nombre`, 'Nombre', 120)}${campo(`metodos.${i}.apodo`, 'Descripción corta', 120)}${campo(`metodos.${i}.dura`, 'Duración', 120)}
    <label>Embarazos por cada 100 mujeres al año<input type="number" data-ruta="metodos.${i}.efic" data-num="1" min="0" max="100" step="0.01" value="${m.efic}"></label></div>
    ${area(`metodos.${i}.uso`, 'Cómo se usa', 400)}${area(`metodos.${i}.lact`, 'Lactancia', 400)}${area(`metodos.${i}.efectos`, 'Qué puede notar', 400)}</div>`).join('');
  const mitos = C.mitos.map((m, i) => `<div class="item">${campo(`mitos.${i}.q`, 'Frase', 200)}
    <div class="row"><label class="marca"><input type="checkbox" data-ruta="mitos.${i}.v"${m.v ? ' checked' : ''}>Es verdad</label>${marca(`mitos.${i}.activo`, 'Visible')}<button class="link" data-quitar="mitos.${i}">Quitar</button></div>
    ${area(`mitos.${i}.r`, 'Explicación', 500)}${campo(`mitos.${i}.f`, 'Fuente', 120)}</div>`).join('');
  const temores = C.temores.map((t, i) => `<div class="item">${campo(`temores.${i}.q`, 'Duda, con las palabras de la paciente', 200)}
    <div class="row">${marca(`temores.${i}.activo`, 'Visible')}<button class="link" data-quitar="temores.${i}">Quitar</button></div>
    ${area(`temores.${i}.r`, 'Respuesta', 500)}${campo(`temores.${i}.f`, 'Fuente', 120)}</div>`).join('');
  const videos = C.videos.map((v, i) => `<div class="item"><div class="rejilla">${campo(`videos.${i}.t`, 'Título', 80)}
    <label>Enlace (https://)<input type="url" data-ruta="videos.${i}.url" maxlength="500" value="${esc(v.url)}"></label>
    <label>Se muestra en<select data-ruta="videos.${i}.m"><option value="">Ayuda (video general)</option>${C.metodos.map(m => `<option value="${m.id}"${v.m === m.id ? ' selected' : ''}>Ficha: ${esc(m.nombre)}</option>`).join('')}</select></label></div>
    <div class="row"><button class="link" data-quitar="videos.${i}">Quitar</button></div></div>`).join('');

  $('#admin').innerHTML = `<div class="top"><span class="brand">Elijo · Administración</span><span class="row"><span class="muted small">${esc(usuario)}</span><button class="link" data-act="salir">Cerrar sesión</button></span></div>
    <p class="muted">Aquí se configura la información que reciben las pacientes. Los cambios se publican al guardar. Las reglas clínicas de elegibilidad no se editan desde este panel.</p>
    ${errores.length ? `<div class="errores"><b>Hay datos por corregir:</b><ul class="plain">${errores.map(e => `<li>${esc(e)}</li>`).join('')}</ul></div>` : ''}
    ${seccion('Versión del contenido', `<div class="rejilla">${campo('version', 'Versión', 30)}<label>Fecha de revisión<input type="date" data-ruta="fecha" value="${esc(C.fecha)}"></label></div>`, true)}
    ${seccion(`Métodos (${C.metodos.filter(m => m.activo).length} visibles de ${C.metodos.length})`, metodos)}
    ${seccion(`Verdad o mito (${C.mitos.length})`, mitos + '<button class="btn quiet" data-agregar="mitos">Añadir tarjeta</button>')}
    ${seccion(`Dudas y temores (${C.temores.length})`, temores + '<button class="btn quiet" data-agregar="temores">Añadir duda</button>')}
    ${seccion(`Videos guía (${C.videos.length})`, (videos || '<p class="muted small">Aún no hay videos.</p>') + '<button class="btn quiet" data-agregar="videos">Añadir video</button>')}
    ${seccion(`Datos para pacientes (${C.datos.length})`, '<p class="small muted">Frases cortas, en positivo, que aparecen en “¿Sabías que?” y en Ayuda. Cada una con su fuente.</p>' + C.datos.map((d, i) => `<div class="item">${area(`datos.${i}.t`, 'Dato', 240)}${campo(`datos.${i}.f`, 'Fuente', 120)}<div class="row"><button class="link" data-quitar="datos.${i}">Quitar</button></div></div>`).join('') + '<button class="btn quiet" data-agregar="datos">Añadir dato</button>')}
    ${seccion(`Historias de otras mamás (${C.historias.length})`, '<p class="small muted">Testimonios reales y con permiso de quien los cuenta. Usa solo el nombre de pila o un seudónimo.</p>' + C.historias.map((h, i) => `<div class="item">${campo(`historias.${i}.nombre`, 'Quién lo cuenta (por ejemplo: María, 3 hijos)', 60)}${area(`historias.${i}.texto`, 'Su historia', 600)}<div class="row"><button class="link" data-quitar="historias.${i}">Quitar</button></div></div>`).join('') + '<button class="btn quiet" data-agregar="historias">Añadir historia</button>')}
    ${seccion('Para la pareja', `<label>Un consejo por línea<textarea id="a-pareja" rows="7">${esc(C.pareja.join('\n'))}</textarea></label>`)}
    ${seccion('Señales de alarma', `<label>Una señal por línea<textarea id="a-alarmas" rows="9">${esc(C.alarmas.join('\n'))}</textarea></label>`)}
    ${seccion(`Referencias bibliográficas (${C.refs.length})`, `<label>Una referencia por línea, con el formato: cita completa | https://enlace<textarea id="a-refs" rows="14">${esc(C.refs.map(r => r[0] + ' | ' + r[1]).join('\n'))}</textarea></label>`)}
    ${seccion('Registro de consejerías', vistaRegistro())}
    ${seccion('Estadísticas', vistaEstadisticas())}
    ${seccion('Cambiar mi clave', `<form class="stack" id="f-clave"><div class="rejilla"><label>Clave actual<input type="password" id="c-actual" autocomplete="current-password" required></label><label>Clave nueva (mínimo 10 caracteres)<input type="password" id="c-nueva" autocomplete="new-password" minlength="10" required></label></div><div><button class="btn quiet" type="submit">Cambiar clave</button></div></form>`)}
    ${seccion('Volver al contenido inicial', '<p class="small muted">Descarta todo lo publicado y vuelve al contenido con el que se instaló la app. La versión actual queda guardada en el historial del servidor.</p><div><button class="btn quiet" data-act="restaurar">Restaurar contenido inicial</button></div><div id="confirma"></div>')}
    <div class="barra"><div><span class="small muted" id="estado">${sucio ? 'Hay cambios sin publicar.' : 'Todo está publicado.'}</span><span class="row"><a class="link" href="/" target="_blank" rel="noopener">Ver la app</a><button class="btn" data-act="guardar">Guardar y publicar</button></span></div></div>`;
}

/* Pasa lo escrito en pantalla al objeto de contenido antes de guardar o de volver a dibujar. */
function recoger() {
  document.querySelectorAll('[data-ruta]').forEach(el => {
    escribir(el.dataset.ruta, el.type === 'checkbox' ? el.checked : el.dataset.num ? Number(el.value) : el.value);
  });
  const lineas = id => $(id).value.split('\n').map(l => l.trim()).filter(Boolean);
  C.alarmas = lineas('#a-alarmas');
  C.pareja = lineas('#a-pareja');
  C.refs = lineas('#a-refs').map(l => { const i = l.lastIndexOf('|'); return i < 0 ? [l, ''] : [l.slice(0, i).trim(), l.slice(i + 1).trim()]; });
}
const abiertas = () => [...document.querySelectorAll('details.panel')].map(d => d.open);
function redibujar() { const ab = abiertas(); vistaPanel(); document.querySelectorAll('details.panel').forEach((d, i) => { if (ab[i] !== undefined) d.open = ab[i]; }); }

async function arrancar() {
  try { usuario = (await api('GET', '/api/admin/sesion')).usuario; }
  catch (e) {
    const est = await api('GET', '/api/admin/estado').catch(() => ({}));
    return est.configurar ? vistaConfigurar() : vistaEntrada(est.hayAdmin === false ? 'Aún no hay administradora. Pide a quien instaló la app que defina el código de configuración.' : '');
  }
  await cargarTodo();
  vistaPanel();
}
async function cargarTodo() { C = await api('GET', '/api/contenido'); R = await api('GET', '/api/admin/registro'); }

document.addEventListener('submit', async ev => {
  ev.preventDefault();
  if (ev.target.id === 'f-configurar') {
    if ($('#s-clave').value !== $('#s-clave2').value) return vistaConfigurar('Las dos claves no coinciden.');
    try { usuario = (await api('POST', '/api/admin/configurar', {token: $('#s-token').value.trim(), usuario: $('#s-usuario').value.trim(), clave: $('#s-clave').value})).usuario; await cargarTodo(); vistaPanel(); toast('Administradora creada. Ya puedes borrar el código de configuración del servidor.'); }
    catch (e) { vistaConfigurar(e.message); }
  }
  if (ev.target.id === 'f-entrar') {
    try { usuario = (await api('POST', '/api/admin/entrar', {usuario: $('#e-usuario').value.trim(), clave: $('#e-clave').value})).usuario; await cargarTodo(); vistaPanel(); }
    catch (e) { vistaEntrada(e.message); }
  }
  if (ev.target.id === 'f-clave') {
    try { await api('POST', '/api/admin/clave', {actual: $('#c-actual').value, nueva: $('#c-nueva').value}); ev.target.reset(); toast('Clave cambiada'); }
    catch (e) { toast(e.message); }
  }
});
document.addEventListener('input', ev => { if (ev.target.closest('#f-clave, #f-entrar, [data-centro]')) return; sucio = true; const e = $('#estado'); if (e) e.textContent = 'Hay cambios sin publicar.'; });
document.addEventListener('click', async ev => {
  const b = ev.target.closest('button'); if (!b || b.form) return; // los botones de los formularios (entrar, configurar, clave) los atiende el evento submit
  const d = b.dataset;
  if (d.agregar) {
    recoger(); sucio = true;
    C[d.agregar].push(d.agregar === 'mitos' ? {q: '', v: false, r: '', f: '', activo: true} : d.agregar === 'temores' ? {q: '', r: '', f: '', activo: true} : d.agregar === 'datos' ? {t: '', f: ''} : d.agregar === 'historias' ? {nombre: '', texto: ''} : {t: '', url: '', m: ''});
    return redibujar();
  }
  if (d.quitar) { recoger(); sucio = true; const [lista, i] = d.quitar.split('.'); C[lista].splice(+i, 1); return redibujar(); }
  if (d.act === 'guardar') {
    recoger();
    try { C = await api('PUT', '/api/admin/contenido', C); errores = []; sucio = false; redibujar(); toast('Publicado. Las pacientes ya ven esta versión.'); }
    catch (e) { if (e.estado === 401) return vistaEntrada('La sesión terminó. Entra de nuevo; los cambios sin publicar se perdieron.'); errores = e.errores.length ? e.errores : [e.message]; redibujar(); window.scrollTo(0, 0); }
  }
  if (d.act === 'restaurar') { $('#confirma').innerHTML = '<p class="errores">Esto reemplaza todo el contenido publicado. <button class="link" data-act="restaurar-si">Sí, restaurar</button></p>'; }
  if (d.act === 'restaurar-si') { try { C = await api('POST', '/api/admin/restaurar'); errores = []; sucio = false; redibujar(); toast('Contenido inicial restaurado'); } catch (e) { toast(e.message); } }
  if (d.act === 'actualizarregistro') { try { recoger(); recogerCentros(); const centrosEditados = R.centros; R = await api('GET', '/api/admin/registro'); R.centros = centrosEditados.length ? centrosEditados : R.centros; redibujar(); toast('Conteos actualizados'); } catch (e) { toast(e.message); } return; }
  if (d.act === 'copiarcsv') { const t = csvRegistro(); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Datos copiados'), () => toast('No se pudo copiar; usa el recuadro CSV de Registro')); return; }
  if (d.act === 'agregarcentro') { recoger(); recogerCentros(); R.centros.push({id: '', nombre: '', codigo: ''}); return redibujar(); }
  if (d.quitarcentro !== undefined) { recoger(); recogerCentros(); R.centros.splice(+d.quitarcentro, 1); return redibujar(); }
  if (d.act === 'guardarcentros') {
    recoger(); recogerCentros();
    try { R.centros = (await api('PUT', '/api/admin/centros', {centros: R.centros})).centros; redibujar(); toast('Centros guardados: ' + R.centros.length); }
    catch (e) { toast(e.message); }
    return;
  }
  if (d.act === 'salir') { await api('POST', '/api/admin/salir').catch(() => {}); usuario = null; vistaEntrada(); }
});
document.addEventListener('change', ev => { const k = ev.target.dataset && ev.target.dataset.est; if (k) { E[k] = ev.target.value; recoger(); recogerCentros(); redibujar(); } });
window.addEventListener('beforeunload', ev => { if (sucio) ev.preventDefault(); });
arrancar();
