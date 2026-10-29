/* Elijo: consejería anticonceptiva. El contenido llega del servidor; las reglas clínicas viven en este archivo. */
const escTxt = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function sanear(c){
  // Los textos se insertan como HTML: se escapan una sola vez al cargar. Los videos se escapan al mostrarlos.
  const t = v => typeof v === 'string' ? escTxt(v) : Array.isArray(v) ? v.map(t) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, t(x)])) : v;
  const videos = c.videos || [];
  return {...t({...c, videos:[]}), videos};
}
async function cargarContenido(){
  try {
    const r = await fetch('/api/contenido', {cache:'no-store'});
    if (!r.ok) throw new Error(r.status);
    const c = await r.json();
    try { localStorage.setItem('elijo-contenido', JSON.stringify(c)); } catch(e){}
    return c;
  } catch(e){
    try { const g = JSON.parse(localStorage.getItem('elijo-contenido') || 'null'); if (g) return g; } catch(e2){}
    return (await fetch('/contenido.inicial.json')).json();
  }
}
function iniciar(C){

/* ===== Contenido clínico (BORRADOR, pendiente de validación por obstetricia) ===== */
const DIA = 864e5;
const METODOS = C.metodos;
const CONDICIONES = [
  {id:'presion', t:'Presión alta', afecta:'combi', mas:['dmpa']},
  {id:'trombosis', t:'Trombosis o coágulos', afecta:'combi', mas:['dmpa']},
  {id:'migrana', t:'Migraña con luces o destellos', afecta:'combi'},
  {id:'fumo', t:'Fumo y tengo 35 años o más', afecta:'combi'},
  {id:'diabetes', t:'Diabetes', afecta:'combi', mas:['dmpa']},
  {id:'mama', t:'Cáncer de mama', afecta:'hormonal'},
  {id:'higado', t:'Enfermedad del hígado', afecta:'hormonal'},
  {id:'nose', t:'No estoy segura', afecta:'combi'}
];
const IMPORTA = [
  {id:'nodiario', t:'No acordarme todos los días'},
  {id:'sinhormonas', t:'Que no tenga hormonas'},
  {id:'discreto', t:'Que nadie lo note'},
  {id:'anios', t:'Que dure años'},
  {id:'dejar', t:'Poder dejarlo cuando quiera'}
];
const MITOS = C.mitos;

/* ===== Motor de reglas: respuestas -> estado de cada método ===== */
function dias(a, hoy){ return a.general ? 99999 : a.embarazada ? -1 : Math.floor((hoy - new Date(a.nacimiento + 'T00:00:00')) / DIA); }
function fechaDesde(a, d){ return new Date(new Date(a.nacimiento + 'T00:00:00').getTime() + d * DIA); }
function estado(m, a, hoy){
  const d = dias(a, hoy), lacta = a.alimento !== 'formula', pre = a.embarazada;
  const e = (g, nota, desde) => ({g, nota, desde});
  let r;
  const fin = r => {
    const cond = CONDICIONES.filter(c => a.condiciones.includes(c.id) && ((c.afecta === 'combi' && m.combinado) || (c.afecta === 'hormonal' && m.hormonal) || (c.mas || []).includes(m.id)));
    if (cond.length && r.g !== 'luego') return e('conversa', 'Marcaste: ' + cond.map(c => c.t.toLowerCase()).join(', ') + '. Tu obstetra debe valorar este método contigo.');
    if (cond.length) r.nota += ' Además, tu obstetra debe valorarlo por tu salud.';
    return r;
  };
  if (a.general){
    if (m.id === 'mela' || (m.permanente && a.deseo !== 'nomas')) return e('oculto');
    return fin(e('ok', m.permanente ? 'Es permanente. Conversa con calma antes de decidir.' : m.id === 'condon' ? 'Puedes combinarlo con otro método.' : 'Puede iniciarse cuando lo decidas. Tu obstetra confirmará antes que no hay embarazo.'));
  }
  if (m.id === 'mela'){
    if (pre) r = e('luego', 'Podrá protegerte si das solo pecho y no vuelve tu regla, hasta los 6 meses.');
    else if (d < 183 && a.alimento === 'pecho' && a.regla === 'no') r = e('ok', 'Hoy cumples las 3 condiciones. Deja de proteger si das fórmula, vuelve tu regla o tu bebé cumple 6 meses.');
    else r = e('no', a.alimento !== 'pecho' ? 'No te protege porque tu bebé no toma solo pecho.' : a.regla === 'si' ? 'Ya no te protege porque volvió tu regla.' : 'Ya no te protege: tu bebé tiene más de 6 meses.');
    return r;
  }
  if (m.permanente){
    if (a.deseo !== 'nomas') return e('oculto');
    if (m.id === 'vasectomia') return e('ok', 'Es permanente. Conversen con calma antes de decidir.');
    if (pre || d < 7 || d >= 42) r = e('ok', 'Es permanente. Conversa con tu obstetra antes de decidir.');
    else r = e('luego', 'Entre la primera y la sexta semana se espera.', fechaDesde(a, 42));
  } else if (m.id === 'diu_cu' || m.id === 'diu_lng'){
    if (pre) r = e('ok', 'Puede colocarse en las primeras 48 horas después del parto. Pídelo antes de dar a luz.');
    else if (d < 2) r = e('ok', 'Puede colocarse ahora, en las primeras 48 horas.');
    else if (d < 28) r = e('luego', 'Pasadas las 48 horas se espera hasta las 4 semanas.', fechaDesde(a, 28));
    else r = e('ok', 'Puede colocarse en tu próximo control.');
  } else if (m.combinado){
    if (pre) r = e('luego', a.alimento === 'pecho' ? 'Si das solo pecho, se espera hasta los 6 meses.' : a.alimento === 'mixta' ? 'Con pecho y fórmula pueden iniciarse desde las 6 semanas.' : 'Si no das pecho, pueden iniciarse desde las 3 a 6 semanas, según tu riesgo de coágulos.');
    else if (a.alimento === 'pecho'){
      if (d < 183) r = e('luego', 'Dando solo pecho se espera hasta los 6 meses, o hasta que la leche deje de ser el alimento principal.', fechaDesde(a, 183));
      else r = e('ok', 'Después de los 6 meses se pueden usar aunque des pecho.');
    } else if (lacta){
      if (d < 42) r = e('luego', 'Con pecho y fórmula pueden iniciarse desde las 6 semanas.', fechaDesde(a, 42));
      else r = e('ok', 'Con pecho y fórmula se pueden usar desde las 6 semanas.');
    } else {
      if (d < 21) r = e('luego', 'En las primeras 3 semanas no se usan por riesgo de coágulos.', fechaDesde(a, 21));
      else if (d < 42) r = e('conversa', 'Entre las 3 y 6 semanas depende de tu riesgo de coágulos.');
      else r = e('ok', 'Desde las 6 semanas se pueden usar.');
    }
  } else if (m.id === 'condon'){
    r = e('ok', 'Úsalo desde que retomes las relaciones. Puedes combinarlo con otro método.');
  } else {
    r = e('ok', pre ? 'Puede iniciarse antes de salir del hospital.' : (lacta && d < 42 ? 'Se puede usar dando pecho, también en las primeras semanas.' : 'Se puede iniciar ahora.'));
  }
  return fin(r);
}
function opciones(a, hoy, lista){
  const out = {ok:[], luego:[], conversa:[], no:[]};
  for (const m of (lista || METODOS)){
    const s = estado(m, a, hoy); if (s.g === 'oculto') continue;
    out[s.g].push({m, s, puntos: m.tags.filter(t => a.importa.includes(t)).length});
  }
  out.ok.sort((x, y) => y.puntos - x.puntos || x.m.efic - y.m.efic);
  return out;
}
/*UI*/
/* ===== Estado ===== */
const hoy = new Date(); hoy.setHours(0,0,0,0);
const iso = d => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
const EJEMPLO = {general:false, embarazada:false, nacimiento: iso(new Date(hoy.getTime() - 21*DIA)), parto:'normal', alimento:'pecho', regla:'no', deseo:'anios', importa:['nodiario'], condiciones:[], ejemplo:true};
let S = {asis:{i:0, sel:null, prev:null, anim:false, toc:{}}, guion:{momento:'I', resp:{}, pos:{tiempo:'', lacta:false, tev:false, sepsis:false}, grupo:0, prellenado:false}, rueda:{momento:'I', sel:new Set(), abierto:0}, dato:0, codigo:'', registradas:0, reg:{fase:'app', metodo:null}, vista:'inicio', paso:0, a:{...EJEMPLO}, metodo:null, comparar:[], favoritos:[], dudas:[], mito:0, mitoVisto:false, obst:'asistente', lista:[]};
try { const g = JSON.parse(localStorage.getItem('elijo') || 'null'); if (g && g.a) { S.a = g.a; S.favoritos = g.favoritos || []; } } catch(e){}
try { S.codigo = localStorage.getItem('elijo-codigo') || ''; S.centro = localStorage.getItem('elijo-centro') || ''; } catch(e){}
const guardar = () => { try { localStorage.setItem('elijo', JSON.stringify({a:S.a, favoritos:S.favoritos})); } catch(e){} };

/* ===== Contenido publicado por la administración ===== */
const TEMORES = C.temores, REFS = C.refs;
const CFG = {version:C.version, fecha:C.fecha, metodos:Object.fromEntries(METODOS.map(m => [m.id, {activo:!!m.activo, msp:!!m.msp}])), mitos:MITOS.map(m => m.activo !== false), temores:TEMORES.map(t => t.activo !== false), videos:C.videos || []};
const activos = () => METODOS.filter(m => CFG.metodos[m.id].activo);
const melaOn = () => !!(CFG.metodos.mela && CFG.metodos.mela.activo);
const mitosOn = () => MITOS.map((m, i) => i).filter(i => CFG.mitos[i]);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const crudo = s => { const t = document.createElement('textarea'); t.innerHTML = s; return t.value; };
const videosDe = id => CFG.videos.filter(v => v.m === id);
const linkVideo = v => '<a class="btn quiet wide video" href="' + esc(v.url) + '" target="_blank" rel="noopener">Ver video: ' + esc(v.t) + '</a>';
const DATOS = C.datos || [], HISTORIAS = C.historias || [], PAREJA = C.pareja || [];
/* Envíos anónimos con cola: si no hay señal se guardan en el teléfono y salen al volver la conexión. */
function leerCola(){ try { return JSON.parse(localStorage.getItem('elijo-cola') || '[]'); } catch(e){ return []; } }
function guardarCola(c){ try { localStorage.setItem('elijo-cola', JSON.stringify(c.slice(-200))); } catch(e){} }
async function vaciarCola(){
  const pend = leerCola(); if (!pend.length) return;
  const quedan = [];
  for (const x of pend){
    try { await fetch(x.ruta, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(x.cuerpo)}); }
    catch(e){ quedan.push(x); }
  }
  guardarCola(quedan);
}
window.addEventListener('online', vaciarCola); vaciarCola();
function textoPareja(){ return ['Para acompañar después del parto:'].concat(PAREJA.map(x => '• ' + crudo(x)), [location.origin]).join('\n'); }
function parejaHtml(){
  if (!PAREJA.length) return '';
  return '<div class="panel stack"><h3>Para tu pareja</h3><ul class="plain">' + PAREJA.map(x => '<li>' + x + '</li>').join('') + '</ul>' +
    '<a class="btn quiet wide" href="https://wa.me/?text=' + encodeURIComponent(textoPareja()) + '" target="_blank" rel="noopener">Enviar por WhatsApp</a>' +
    '<button class="btn quiet wide" data-act="copiarpareja">Copiar el mensaje</button></div>';
}
function calendario(){
  const a = S.a, f = d => iso(fechaDesde(a, d)).replace(/-/g, ''), sig = d => iso(fechaDesde(a, d + 1)).replace(/-/g, '');
  const ev = [[28, 'Elijo: desde hoy se puede colocar la T o el DIU'], [42, 'Elijo: control de las 6 semanas y método anticonceptivo'], [183, 'Elijo: mi bebé cumple 6 meses, revisar mi método']];
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Elijo//ES'].concat(ev.flatMap(([d, t], i) => ['BEGIN:VEVENT', 'UID:elijo-' + i + '-' + f(d) + '@elijo', 'DTSTAMP:' + f(0) + 'T000000Z', 'DTSTART;VALUE=DATE:' + f(d), 'DTEND;VALUE=DATE:' + sig(d), 'SUMMARY:' + t, 'END:VEVENT']), ['END:VCALENDAR']).join('\r\n');
  const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([ics], {type:'text/calendar'})); l.download = 'elijo-recordatorios.ics';
  document.body.appendChild(l); l.click(); l.remove(); toast('Abre el archivo para añadir las fechas a tu calendario');
}
const alarmasHtml = '<ul class="plain">' + C.alarmas.map(x => '<li>' + x + '</li>').join('') + '</ul>';
const $ = s => document.querySelector(s);
const fecha = d => d.toLocaleDateString('es-EC', {day:'numeric', month:'long'});
const efTxt = n => n < 1 ? 'menos de 1' : String(n);

/* ===== Íconos ===== */
const ICO = {
  implante:'<path d="M9 30c4-10 10-18 18-22"/><rect x="15" y="14" width="12" height="4" rx="2" transform="rotate(-40 21 16)"/>',
  diu_cu:'<path d="M8 9h20M18 9v18M8 9c0 3 2 4 4 4M28 9c0 3-2 4-4 4"/><path d="M18 27v4"/>',
  diu_lng:'<path d="M8 9h20M18 9v18"/><rect x="15" y="13" width="6" height="10" rx="3"/><path d="M18 27v4"/>',
  dmpa:'<path d="M24 6l6 6M27 9L13 23l-3 5 5-3 14-14M10 28l-4 4M17 13l6 6"/>',
  pop:'<rect x="6" y="9" width="24" height="18" rx="4"/><circle cx="12" cy="15" r="1.6"/><circle cx="18" cy="15" r="1.6"/><circle cx="24" cy="15" r="1.6"/><circle cx="12" cy="21" r="1.6"/><circle cx="18" cy="21" r="1.6"/><circle cx="24" cy="21" r="1.6"/>',
  combi:'<circle cx="18" cy="18" r="12"/><circle cx="18" cy="10" r="1.6"/><circle cx="25" cy="14" r="1.6"/><circle cx="25" cy="22" r="1.6"/><circle cx="18" cy="26" r="1.6"/><circle cx="11" cy="22" r="1.6"/><circle cx="11" cy="14" r="1.6"/>',
  condon:'<path d="M12 30V14a6 6 0 0112 0v16M10 30h16M18 8V5"/>',
  mela:'<path d="M18 30S6 22 6 14a6 6 0 0112-2 6 6 0 0112 2c0 8-12 16-12 16z"/>',
  ligadura:'<path d="M6 12c6 0 8 12 12 12s6-12 12-12M14 18h8"/>',
  vasectomia:'<path d="M6 24c6 0 8-12 12-12s6 12 12 12M15 15l6 6M21 15l-6 6"/>'
};
const ico = id => '<span class="ico" aria-hidden="true"><svg viewBox="0 0 36 36">' + ICO[id] + '</svg></span>';
const TAB = {
  opciones:['Opciones','<path d="M4 6h16M4 12h16M4 18h10"/>'],
  mitos:['Dudas','<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-1 .8-1.5 1.3-1.5 2.5M12 17h.01"/>'],
  resumen:['Mi resumen','<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>'],
  ayuda:['Ayuda','<path d="M12 21s-8-5-8-11a4.5 4.5 0 018-3 4.5 4.5 0 018 3c0 6-8 11-8 11z"/>']
};

/* ===== Vistas ===== */
const cabecera = (t) => '<div class="top"><button class="link" data-go="inicio" style="text-decoration:none"><span class="brand">Elijo</span></button>' + (t || '') + '</div>';
const aviso = '<p class="proto">Esta app no reemplaza la consulta con tu obstetra.</p>';

function vInicio(){
  return cabecera() + '<section class="hero"><h1>Tú decides qué método usar después del parto</h1><p>Responde 7 preguntas cortas y mira qué opciones son seguras para ti hoy.</p></section>' +
  '<div class="stack"><button class="btn wide" data-act="empezar">Empezar</button>' +
  '<button class="btn ghost wide" data-act="plan">Estoy embarazada: armar mi plan</button>' +
  '<button class="btn ghost wide" data-act="general">No estoy en posparto</button>' +
  '<button class="btn quiet wide" data-go="opciones">Ver un ejemplo</button>' +
  '<button class="btn quiet wide" data-go="obstetra">Soy obstetra</button></div>' +
  '<div class="panel stack"><h3>Aquí nadie te juzga</h3><p>Tú decides, también si decides no usar ningún método. Si tienes dudas o temores, <button class="link" data-go="mitos" style="padding:0">mira lo que otras mujeres preguntan</button>.</p></div>' +
  '<p class="muted small">No pedimos tu nombre ni tu cédula. Tus respuestas se quedan en este teléfono y puedes borrarlas cuando quieras.</p>' +
  '<button class="link" data-go="referencias">Referencias bibliográficas</button>' + aviso;
}

const PREG = [
  {k:'nacimiento', t:'¿Cuándo nació tu bebé?', tipo:'fecha', solo:a => !a.general && !S.plan},
  {k:'parto', t:'¿Cómo fue el parto?', o:[['normal','Parto normal'],['cesarea','Cesárea']], solo:a => !a.general && !a.embarazada},
  {k:'alimento', t:'¿Cómo alimentas a tu bebé?', alt:'¿Cómo piensas alimentar a tu bebé?', o:[['pecho','Solo pecho'],['mixta','Pecho y fórmula'],['formula','Solo fórmula']], solo:a => !a.general},
  {k:'regla', t:'¿Ya volvió tu regla?', o:[['no','Todavía no'],['si','Sí']], solo:a => !a.general && !a.embarazada && melaOn()},
  {k:'deseo', t:'¿Quieres otro embarazo?', o:[['pronto','Sí, pronto'],['anios','Sí, en unos años'],['nomas','No quiero más'],['nose','No lo sé todavía']]},
  {k:'importa', t:'¿Qué te importa más en un método?', multi:IMPORTA.map(i => [i.id, i.t]), sub:'Puedes marcar varias.'},
  {k:'condiciones', t:'¿Tienes alguna de estas condiciones?', multi:CONDICIONES.map(c => [c.id, c.t]), sub:'Marca las que apliquen. Si no tienes ninguna, continúa.'}
];
const pasos = () => PREG.filter(p => !p.solo || p.solo(S.a));
function vPreguntas(){
  const ps = pasos(), p = ps[Math.min(S.paso, ps.length-1)], a = S.a;
  let cuerpo = '';
  if (p.tipo === 'fecha'){
    cuerpo = '<label class="stack" for="f-nac"><span class="muted small">Fecha de nacimiento</span><input type="date" id="f-nac" max="' + iso(hoy) + '" value="' + (a.embarazada ? '' : a.nacimiento) + '"></label>' +
      '<button class="opt" data-act="embarazada" aria-pressed="' + a.embarazada + '"><span class="tick">' + (a.embarazada ? '✓' : '') + '</span>Aún estoy embarazada</button>';
  } else if (p.o){
    cuerpo = p.o.map(([v, t]) => '<button class="opt" data-set="' + p.k + '" data-v="' + v + '" aria-pressed="' + (a[p.k] === v) + '"><span class="tick">' + (a[p.k] === v ? '✓' : '') + '</span>' + t + '</button>').join('');
  } else {
    cuerpo = p.multi.map(([v, t]) => '<button class="opt" data-multi="' + p.k + '" data-v="' + v + '" aria-pressed="' + a[p.k].includes(v) + '"><span class="tick">' + (a[p.k].includes(v) ? '✓' : '') + '</span>' + t + '</button>').join('');
  }
  const titulo = (a.embarazada && p.alt) ? p.alt : p.t;
  const oir = ('speechSynthesis' in window) ? '<button class="link" data-act="oir" data-txt="' + titulo + '">Escuchar</button>' : '';
  return cabecera('<span class="muted small">' + (S.paso+1) + ' de ' + ps.length + '</span>') +
    '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + ps.length + '" aria-valuenow="' + (S.paso+1) + '"><i style="width:' + ((S.paso+1)/ps.length*100) + '%"></i></div>' +
    '<div class="stack"><h2>' + titulo + '</h2>' + (p.sub ? '<p class="muted">' + p.sub + '</p>' : '') + oir + '</div>' +
    '<div class="stack">' + cuerpo + '</div>' +
    '<div class="row"><button class="btn quiet" data-act="atras">Atrás</button><button class="btn" style="flex:1" data-act="sigue">' + (S.paso === ps.length-1 ? 'Ver mis opciones' : 'Continuar') + '</button></div>';
}

function tarjeta(x, cls){
  const {m, s} = x, sel = S.comparar.includes(m.id);
  const tags = IMPORTA.filter(i => m.tags.includes(i.id) && S.a.importa.includes(i.id)).map(i => '<span class="pill tag">' + i.t + '</span>').join(' ');
  return '<div class="card ' + cls + '">' + ico(m.id) + '<div class="body"><h3>' + m.nombre + '</h3><p class="muted small">' + m.apodo + '</p>' +
    (s.desde ? '<p><span class="pill wait">Desde el ' + fecha(s.desde) + '</span></p>' : '') +
    '<p class="small">' + s.nota + '</p>' + (tags && cls === 'ok' ? '<p>' + tags + '</p>' : '') +
    '<div class="row"><button class="link" data-metodo="' + m.id + '">Ver más</button>' +
    (cls !== 'no' ? '<button class="link" data-cmp="' + m.id + '">' + (sel ? 'Quitar de comparar' : 'Comparar') + '</button>' : '') + '</div></div></div>';
}
function contexto(){
  const a = S.a, d = dias(a, hoy);
  if (a.general) return 'Consulta general, no posparto';
  const t = a.embarazada ? 'Aún embarazada' : d < 14 ? d + ' días después del parto' : Math.floor(d/7) + ' semanas después del parto';
  const al = {pecho:'solo pecho', mixta:'pecho y fórmula', formula:'solo fórmula'}[a.alimento];
  return t + ' · ' + al;
}
function vOpciones(){
  const o = opciones(S.a, hoy, activos());
  const grupo = (lista, cls, pill, titulo) => lista.length ? '<section class="stack"><p class="group-h"><span class="pill ' + pill + '">' + lista.length + '</span>' + titulo + '</p>' + lista.map(x => tarjeta(x, cls)).join('') + '</section>' : '';
  return cabecera('<button class="link" data-act="empezar">Cambiar respuestas</button>') +
    (S.a.ejemplo ? '<p class="proto">Estás viendo un ejemplo: bebé de 3 semanas, solo pecho. Responde las preguntas para ver tus opciones.</p>' : '') +
    '<div class="stack"><h2>' + (S.a.embarazada && !S.a.general ? 'Tu plan para el parto' : 'Tus opciones') + '</h2><p class="muted">' + contexto() + '</p>' + (S.a.embarazada && !S.a.general ? '<p>Elige ahora, con calma. Algunos métodos se colocan al momento del parto y hay que pedirlos antes.</p>' : '') + '</div>' +
    (S.comparar.length >= 2 ? '<button class="btn wide" data-go="comparar">Comparar ' + S.comparar.length + ' métodos</button>' : '') +
    (DATOS.length ? '<div class="panel stack sabias"><p class="muted small">¿Sabías que?</p><p>' + DATOS[S.dato % DATOS.length].t + '</p><button class="link" data-act="otrodato">Ver otro dato</button></div>' : '') +
    '<button class="btn quiet wide" data-go="mitos">¿Tienes dudas o temores? Míralos aquí</button>' +
    grupo(o.ok, 'ok', 'ok', 'Recomendados para ti ahora') +
    grupo(o.conversa, 'warn', 'warn', 'Conversa con tu obstetra') +
    grupo(o.luego, 'wait', 'wait', 'Más adelante') +
    grupo(o.no, 'no', 'wait', 'No te protege ahora') +
    '<button class="btn quiet wide" data-go="motivo">No quiero usar un método por ahora</button>' + aviso;
}
function puntos(n){
  let h = ''; const llenos = Math.floor(n), medio = n > 0 && n < 1;
  for (let i = 0; i < 100; i++) h += '<i class="' + (i < llenos ? 'hit' : (i === 0 && medio ? 'half' : '')) + '"></i>';
  return '<div class="dots" role="img" aria-label="' + efTxt(n) + ' de 100">' + h + '</div>';
}
function vMetodo(){
  const m = METODOS.find(x => x.id === S.metodo), s = estado(m, S.a, hoy), fav = S.favoritos.includes(m.id);
  const pill = {ok:['ok','Recomendado para ti ahora'], conversa:['warn','Conversa con tu obstetra'], luego:['wait', s.desde ? 'Desde el ' + fecha(s.desde) : 'Más adelante'], no:['wait','No te protege ahora'], oculto:['wait','Solo si no quieres más embarazos']}[s.g];
  return cabecera('<button class="link" data-go="' + (S.volver || 'opciones') + '">Volver</button>') +
    '<div class="row">' + ico(m.id) + '<div style="flex:1"><h2>' + m.nombre + '</h2><p class="muted">' + m.apodo + '</p></div></div>' +
    '<p><span class="pill ' + pill[0] + '">' + pill[1] + '</span></p>' + (s.nota ? '<p>' + s.nota + '</p>' : '') +
    '<div class="panel stack"><h3>De 100 mujeres que lo usan un año, ' + efTxt(m.efic) + (m.efic === 1 ? ' se embaraza' : ' se embarazan') + '</h3>' + puntos(m.efic) + '<p class="muted small">Con el uso habitual, no el perfecto.</p></div>' +
    '<div class="facts"><div class="fact"><b>Dura</b>' + m.dura + '</div><div class="fact"><b>En el MSP</b>' + (CFG.metodos[m.id].msp ? 'Gratis. Confirma en tu centro.' : 'Pregunta si hay.') + '</div></div>' +
    (videosDe(m.id).length ? '<div class="stack">' + videosDe(m.id).map(linkVideo).join('') + '</div>' : '') +
    '<div class="panel stack"><div><h3>Cómo se usa</h3><p>' + m.uso + '</p></div><div><h3>Y la lactancia</h3><p>' + m.lact + '</p></div><div><h3>Qué puedes notar</h3><p>' + m.efectos + '</p></div></div>' +
    '<button class="btn wide ' + (fav ? 'ghost' : '') + '" data-fav="' + m.id + '">' + (fav ? 'Quitar de mi resumen' : 'Me interesa: añadir a mi resumen') + '</button>';
}
function vComparar(){
  const ms = S.comparar.map(id => METODOS.find(m => m.id === id)), cols = 'grid-template-columns:repeat(' + ms.length + ',1fr)';
  const fila = (l, f) => '<div style="' + cols + '"><span class="l">' + l + '</span>' + ms.map(m => '<span class="small">' + f(m) + '</span>').join('') + '</div>';
  return cabecera('<button class="link" data-go="opciones">Volver</button>') + '<h2>Comparar</h2>' +
    '<div class="panel cmp"><div style="' + cols + '">' + ms.map(m => '<span class="h">' + m.nombre + '</span>').join('') + '</div>' +
    fila('Embarazos por cada 100 mujeres al año', m => '<b>' + efTxt(m.efic) + '</b>') + fila('Dura', m => m.dura) +
    fila('Hormonas', m => m.hormonal ? 'Sí' : 'No') + fila('Lactancia', m => m.lact) + fila('Qué puedes notar', m => m.efectos) +
    fila('Para ti hoy', m => { const s = estado(m, S.a, hoy); return {ok:'Recomendado', conversa:'Conversar', luego: s.desde ? 'Desde el ' + fecha(s.desde) : 'Más adelante', no:'No protege', oculto:'—'}[s.g]; }) + '</div>' +
    '<button class="btn quiet wide" data-act="limpiarcmp">Quitar la comparación</button>';
}
function vMitos(){
  const tem = TEMORES.map((t, i) => i).filter(i => CFG.temores[i]);
  const lista = '<div class="stack"><h2>Lo que otras mujeres preguntan</h2><p class="muted">Toca la que se parezca a lo que sientes. Ninguna duda es tonta.</p></div><div class="stack">' +
    tem.map(i => { const t = TEMORES[i], ab = S.temor === i; return '<div class="panel stack"><button class="acc" data-temor="' + i + '" aria-expanded="' + ab + '"><span>“' + t.q + '”</span><span aria-hidden="true">' + (ab ? '−' : '+') + '</span></button>' +
      (ab ? '<p>' + t.r + '</p><p class="muted small">Fuente: ' + t.f + '</p><button class="link" data-dudatxt="' + t.q + '">Quiero hablar de esto en mi consulta</button>' : '') + '</div>'; }).join('') +
    '<p class="small muted">Si decides no usar ningún método, también es tu decisión. Puedes volver cuando quieras.</p></div>';
  const on = mitosOn(); if (!on.length) return cabecera() + lista;
  if (!on.includes(S.mito)) S.mito = on[0];
  const m = MITOS[S.mito];
  return cabecera() + lista + '<div class="stack"><p class="muted">¿Verdad o mito? · ' + (on.indexOf(S.mito)+1) + ' de ' + on.length + '</p><h2>“' + m.q + '”</h2></div>' +
    (S.mitoVisto ? '<div class="panel stack"><p><span class="pill ' + (m.v ? 'ok' : 'warn') + '">' + (m.v ? 'Verdad' : 'Mito') + '</span></p><p>' + m.r + '</p><p class="muted small">Fuente: ' + m.f + '</p></div>' +
      '<div class="row"><button class="btn quiet" data-duda="' + S.mito + '">Preguntar esto en consulta</button><button class="btn" style="flex:1" data-act="otromito">Siguiente</button></div>'
    : '<div class="row"><button class="btn ghost" style="flex:1" data-act="vermito">Verdad</button><button class="btn ghost" style="flex:1" data-act="vermito">Mito</button></div>');
}
function textoResumen(){
  const a = S.a, o = opciones(a, hoy, activos()), n = id => METODOS.find(m => m.id === id).nombre;
  return ['MI RESUMEN (Elijo)', contexto(), a.general ? 'Sin parto reciente' : a.embarazada ? 'Parto: aún no' : 'Parto: ' + (a.parto === 'cesarea' ? 'cesárea' : 'normal') + (melaOn() ? ' · Regla: ' + (a.regla === 'si' ? 'ya volvió' : 'no ha vuelto') : ''),
    'Otro embarazo: ' + {pronto:'sí, pronto', anios:'en unos años', nomas:'no quiero más', nose:'no lo sé'}[a.deseo],
    'Me importa: ' + (a.importa.map(i => IMPORTA.find(x => x.id === i).t.toLowerCase()).join('; ') || 'sin preferencia'),
    'Condiciones: ' + (a.condiciones.map(i => CONDICIONES.find(x => x.id === i).t.toLowerCase()).join('; ') || 'ninguna'),
    'Me interesan: ' + (S.favoritos.map(n).join(', ') || 'aún no elijo'),
    'Opciones para mí hoy: ' + o.ok.map(x => x.m.nombre).join(', '),
    S.dudas.length ? 'Mis preguntas: ' + S.dudas.join(' | ') : ''].filter(Boolean).join('\n');
}
function vResumen(){
  const a = S.a, o = opciones(a, hoy, activos()), plan = a.embarazada && !a.general;
  const hitos = (a.embarazada || a.general) ? '' : '<div class="panel stack"><h3>Fechas para recordar</h3><ul class="plain">' +
    [[28,'Desde aquí se puede colocar la T o el DIU'],[42,'Control de las 6 semanas'],[183,'Tu bebé cumple 6 meses' + (melaOn() ? ': la lactancia ya no protege' : '')]].map(([d, t]) => '<li><b>' + fecha(fechaDesde(a, d)) + '.</b> ' + t + '</li>').join('') + '</ul><button class="btn quiet wide" data-act="calendario">Añadir estas fechas a mi calendario</button></div>';
  return cabecera() + '<div class="stack"><h2>' + (plan ? 'Mi plan para el parto' : 'Mi resumen') + '</h2><p class="muted">' + (plan ? 'Muéstralo en tu control prenatal y cuando llegues a dar a luz.' : 'Muéstralo en tu consulta.') + '</p></div>' +
    (a.ejemplo ? '<p class="proto">Este resumen usa respuestas de ejemplo.</p>' : '') +
    '<div class="panel stack"><h3>Sobre mí</h3><p>' + contexto() + '</p><p class="small muted">' + textoResumen().split('\n').slice(2, 6).join('<br>') + '</p></div>' +
    '<div class="panel stack"><h3>' + (plan ? 'Quiero este método después del parto' : 'Me interesan') + '</h3>' + (S.favoritos.length ? S.favoritos.map(id => { const m = METODOS.find(x => x.id === id); return '<button class="link" data-metodo="' + id + '" data-volver="resumen">' + m.nombre + '</button>'; }).join('') : '<p class="muted">Aún no eliges. Abre un método y toca “Me interesa”.</p>') +
    '<p class="small muted">Opciones para mí hoy: ' + o.ok.map(x => x.m.nombre).join(', ') + '.</p></div>' +
    (S.dudas.length ? '<div class="panel stack"><h3>Mis preguntas</h3><ul class="plain">' + S.dudas.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul></div>' : '') + hitos +
    '<div class="stack"><button class="btn wide" data-act="copiar">Copiar mi resumen</button><button class="btn quiet wide" data-act="borrar">Borrar mis respuestas</button></div>';
}
function vAyuda(){
  return cabecera() + '<h2>Ayuda</h2>' + panelTema() +
    '<div class="alarm stack"><h3>Señales de alarma después del parto</h3>' + alarmasHtml + '<p><b>Acude de inmediato al centro de salud o llama al 911.</b></p></div>' +
    '<div class="panel stack"><h3>Anticoncepción de emergencia</h3><p>Si tuviste una relación sin protección, la pastilla de emergencia sirve hasta 5 días después. Mientras antes, mejor.</p><p>En el MSP se entrega gratis, sin receta, sin cita y a cualquier edad.</p></div>' +
    '<div class="panel stack"><h3>Videos guía</h3>' + (CFG.videos.length ? CFG.videos.map(linkVideo).join('') + '<p class="small muted">Se abren en otra pestaña.</p>' : '<p class="muted">Aún no hay videos. Pronto habrá videos aquí.</p>') + '</div>' +
    (DATOS.length ? '<div class="panel stack"><h3>¿Por qué esperar antes de otro embarazo?</h3>' + DATOS.map(d => '<p>' + d.t + ' <span class="muted small">(' + d.f + ')</span></p>').join('') + '</div>' : '') +
    (HISTORIAS.length ? '<div class="panel stack"><h3>Historias de otras mamás</h3>' + HISTORIAS.map(h => '<blockquote class="historia"><p>“' + h.texto + '”</p><p class="muted small">' + h.nombre + '</p></blockquote>').join('') + '</div>' : '') +
    parejaHtml() +
    '<button class="btn quiet wide" data-go="referencias">Referencias bibliográficas</button>' + aviso;
}
function vReferencias(){
  return cabecera('<button class="link" data-go="ayuda">Volver</button>') + '<div class="stack"><h2>Referencias bibliográficas</h2><p class="muted">De dónde sale la información de esta app. Versión ' + esc(CFG.version) + ', revisada el ' + esc(CFG.fecha) + '.</p></div>' +
    '<ol class="refs">' + REFS.map(r => '<li>' + r[0] + ' <a href="' + r[1] + '" target="_blank" rel="noopener">Abrir fuente</a></li>').join('') + '</ol>' +
    '';
}
const TABLA = [['Implante','2','1','1'],['Inyección de 3 meses','2','1','1'],['Píldora de solo progestina','2','1','1'],['Combinados (lactancia exclusiva)','4','3','2'],['T de cobre','1 (≤48 h) · evitar 48 h a 4 sem','1','1'],['DIU hormonal','2 (≤48 h) · evitar 48 h a 4 sem','1','1']];
const LISTA = ['Explorar si desea otro embarazo y cuándo','Revisar lactancia, semanas postparto y regla','Preguntar por condiciones de salud','Ofrecer todas las opciones elegibles','Verificar que entendió con sus propias palabras','Acordar método, fecha de inicio y de control'];
/* ----- Registro anónimo: solo se envían conteos, nunca datos de la paciente ----- */
const OTROS_MOTIVOS = ['Otra razón', 'Prefiero no decir'];
function enviar(ruta, cuerpo){
  return fetch(ruta, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(cuerpo)});
}
function encolar(ruta, cuerpo){ const c = leerCola(); c.push({ruta, cuerpo}); guardarCola(c); }
function vMotivo(){
  const tem = TEMORES.map((t, i) => i).filter(i => CFG.temores[i]);
  return cabecera('<button class="link" data-go="opciones">Volver</button>') +
    '<div class="stack"><h2>Es tu decisión</h2><p>Nadie te va a insistir. Si quieres, cuéntanos qué te hace dudar. Tu respuesta es anónima y ayuda a tu obstetra a atender mejor.</p></div>' +
    '<div class="stack">' + tem.map(i => '<button class="opt" data-motivo="' + i + '">' + TEMORES[i].q + '</button>').join('') +
    OTROS_MOTIVOS.map(t => '<button class="opt" data-motivo="' + t + '">' + t + '</button>').join('') + '</div>';
}
function elegirMotivo(m){
  const i = Number(m), esTemor = Number.isInteger(i) && TEMORES[i];
  const texto = esTemor ? crudo(TEMORES[i].q) : m;
  // Sin conexión el conteo espera en la cola; la paciente no debe notar ningún error.
  enviar('/api/registro/motivo', {motivo:texto}).catch(() => encolar('/api/registro/motivo', {motivo:texto}));
  if (esTemor){ S.temor = i; if (!S.dudas.includes(texto)) S.dudas.push(texto); toast('Gracias. Mira lo que podemos contarte.'); return ir('mitos'); }
  toast('Gracias. Puedes volver cuando quieras.'); return ir('resumen');
}
function vRegistro(){
  if (!S.codigo) return '<div class="panel stack"><h3>Registro de consejerías</h3><p class="small muted">Cuenta cuántas pacientes salen con un método. No guarda nombres ni cédulas. Pide el código a la administración de la app.</p><label class="stack" for="r-cod"><span class="small muted">Código del establecimiento</span><input type="text" id="r-cod" autocomplete="off"></label><button class="btn wide" data-act="guardarcodigo">Guardar código en este dispositivo</button></div>';
  const r = S.reg, fases = [['base','Línea de base, sin la app'],['app','Consejería con la app']], pend = leerCola().length;
  const ops = activos().map(m => [m.id, m.nombre]).concat([['ninguno','Salió sin método']]);
  return '<div class="panel stack"><h3>Registro de consejerías</h3><p class="small muted">Un registro por paciente, al terminar la consejería. No guarda nombres ni cédulas.</p>' +
    '<div class="row">' + fases.map(([k, t]) => '<button class="btn seg ' + (r.fase === k ? '' : 'quiet') + '" data-regfase="' + k + '">' + t + '</button>').join('') + '</div>' +
    '<p><b>¿Con qué método salió la paciente?</b></p><div class="stack">' + ops.map(([k, t]) => '<button class="opt" data-regmet="' + k + '" aria-pressed="' + (r.metodo === k) + '"><span class="tick">' + (r.metodo === k ? '✓' : '') + '</span>' + t + '</button>').join('') + '</div>' +
    (r.metodo === 'ninguno' ? '<label class="stack" for="r-mot"><span class="small muted">Motivo principal</span><select id="r-mot">' + TEMORES.map(t => t.q).concat(OTROS_MOTIVOS).map(t => '<option>' + t + '</option>').join('') + '</select></label>' : '') +
    '<button class="btn wide" data-act="registrar">Registrar</button>' +
    '<p class="small muted">' + (S.centro ? 'Centro: <b>' + esc(S.centro) + '</b> · ' : '') + 'Código de este teléfono: <b>' + esc(S.codigo) + '</b> · <button class="link" data-act="olvidarcodigo" style="padding:0">Cambiar</button></p>' +
    '<p class="small muted">Enviadas en esta sesión: ' + S.registradas + (pend ? '. <b>Pendientes de envío: ' + pend + '</b> <button class="link" data-act="reintentar" style="padding:0">Reintentar ahora</button>' : '') + '</p></div>';
}
async function registrarConsejeria(){
  const r = S.reg; if (!r.metodo) return toast('Elige con qué método salió la paciente');
  const cuerpo = {codigo:S.codigo, fase:r.fase, metodo:r.metodo};
  if (r.metodo === 'ninguno') cuerpo.motivo = $('#r-mot').value;
  try {
    const res = await enviar('/api/registro/consejeria', cuerpo);
    if (res.status === 403) return toast('El código del establecimiento no es correcto');
    if (!res.ok) return toast('No se pudo registrar. Intenta de nuevo.');
    const j = await res.json().catch(() => ({})); if (j.centro){ S.centro = j.centro; try { localStorage.setItem('elijo-centro', j.centro); } catch(e){} }
    S.registradas++; r.metodo = null; toast('Registrada en ' + (j.centro || 'el servidor')); render();
  } catch(e){ encolar('/api/registro/consejeria', cuerpo); S.registradas++; r.metodo = null; toast('Sin señal: guardada, se enviará sola al volver la conexión'); render(); }
}
/* ----- Rueda de elegibilidad: tabla resumen de la OMS 2025 (rueda.js) ----- */
function prellenarRueda(){
  // Solo se marcan las filas que las respuestas de la paciente determinan sin ambigüedad.
  const a = S.a, d = dias(a, hoy), sel = new Set(), fila = t => { const i = MEC.grupos[0].filas.findIndex(f => f[0] === t); if (i >= 0) sel.add('0.' + i); };
  if (a.general || a.embarazada || a.ejemplo) return sel;
  const lacta = a.alimento !== 'formula';
  if (lacta) fila(d < 42 ? 'Lactancia: menos de 6 semanas posparto' : d < 183 ? 'Lactancia: 6 semanas a menos de 6 meses (lactancia predominante)' : 'Lactancia: 6 meses o más posparto');
  else if (d > 42) fila('Sin lactancia: más de 42 días');
  fila(d < 2 ? 'Inserción de DIU: menos de 48 horas posparto, ' + (lacta ? 'con' : 'sin') + ' lactancia' : d < 28 ? 'Inserción de DIU: de 48 horas a menos de 4 semanas' : 'Inserción de DIU: 4 semanas o más');
  return sel;
}
function celdasMec(res){
  const txt = ['', 'Se puede usar', 'En general se puede usar', 'No se recomienda, salvo que no haya otro método', 'No usar'];
  return MEC.columnas.map((c, i) => { const r = res[i];
    return '<div class="mec c' + r.rango + '"><span class="mec-n">' + (r.rango ? r.texto + (r.aclarar ? '*' : '') : '–') + '</span><span class="mec-t"><b>' + c.t + '</b><br>' +
      (r.rango ? txt[r.rango] + (r.rango >= 2 ? '<br><span class="small">Por: ' + r.causas.join('; ') + '</span>' : '') : 'Sin categoría para lo marcado') + '</span></div>'; }).join('');
}
/* ----- Guion de consulta: preguntas por tema (guion.js) que resuelven la rueda ----- */
function posDesdePaciente(){
  const a = S.a, d = dias(a, hoy);
  if (a.ejemplo) return null;
  return {tiempo: a.general ? 'no' : a.embarazada ? 'pre' : d < 2 ? '48h' : d < 21 ? '3sem' : d < 42 ? '6sem' : d < 183 ? '6m' : 'mas', lacta: !a.general && a.alimento !== 'formula', tev: false, sepsis: false};
}
function vGuion(){
  const G = S.guion, filas = guionFilas(G.resp, G.pos), res = mecEvaluar(filas, G.momento);
  const TIEMPOS = [['pre','Aún embarazada'],['48h','Menos de 48 horas'],['3sem','48 horas a 3 semanas'],['6sem','3 a 6 semanas'],['6m','6 semanas a 6 meses'],['mas','Más de 6 meses'],['no','No está en posparto']];
  const chip = (attr, val, actual, t) => '<button class="btn seg chip ' + (actual === val ? '' : 'quiet') + '" data-' + attr + '="' + val + '">' + t + '</button>';
  const sn = (attr, val, actual) => '<span class="sn">' + chip(attr, val + ':no', actual === 'no' || actual === undefined ? val + ':no' : '', 'No') + chip(attr, val + ':si', actual !== undefined && actual !== 'no' ? val + ':si' : '', 'Sí') + '</span>';
  const esPos = G.pos.tiempo && G.pos.tiempo !== 'no' && G.pos.tiempo !== 'pre';
  let posparto = '<div class="panel stack"><h3>1. Situación posparto</h3><p class="small muted">¿Cuánto tiempo ha pasado desde el parto?</p><div class="row">' + TIEMPOS.map(([v, t]) => chip('gtiempo', v, G.pos.tiempo, t)).join('') + '</div>';
  if (esPos){
    posparto += '<div class="pregunta"><span>¿Está dando de lactar?</span>' + sn('gpos', 'lacta', G.pos.lacta ? 'si' : 'no') + '</div>';
    if (!G.pos.lacta && (G.pos.tiempo === '48h' || G.pos.tiempo === '3sem' || G.pos.tiempo === '6sem')) posparto += '<div class="pregunta"><span>Sin lactancia: ¿tiene otros factores de riesgo de trombosis (cesárea, transfusión, hemorragia, preeclampsia, obesidad, tabaco, inmovilidad)?</span>' + sn('gpos', 'tev', G.pos.tev ? 'si' : 'no') + '</div>';
    posparto += '<div class="pregunta"><span>¿Sepsis puerperal?</span>' + sn('gpos', 'sepsis', G.pos.sepsis ? 'si' : 'no') + '</div>';
  }
  posparto += (posDesdePaciente() ? '<button class="link" data-act="gprellenar">Usar las respuestas de la paciente</button>' : '') + '</div>';
  const grupos = GUION.grupos.map((g, gi) => {
    const pregs = g.preguntas.filter(q => !q.soloGeneral || G.pos.tiempo === 'no');
    const n = pregs.filter(q => { const r = G.resp[q.id]; return r !== undefined && r !== 'no' && r !== 'si'; }).length + pregs.filter(q => !q.opciones && G.resp[q.id] === 'si').length;
    const ab = G.grupo === gi;
    return '<div class="panel stack"><button class="acc" data-ggrupo="' + gi + '" aria-expanded="' + ab + '"><span>' + (gi + 2) + '. ' + g.g + (n ? ' <span class="pill tag">' + n + '</span>' : '') + '</span><span aria-hidden="true">' + (ab ? '−' : '+') + '</span></button>' +
      (ab ? pregs.map(q => { const r = G.resp[q.id];
        if (q.tipo === 'una') return '<div class="pregunta col"><span>' + q.q + '</span><div class="row">' + q.opciones.map((o, i) => chip('gop', q.id + ':' + i, r !== undefined ? q.id + ':' + r : '', o.t)).join('') + '</div></div>';
        return '<div class="pregunta' + (q.opciones && r !== undefined && r !== 'no' ? ' col' : '') + '"><span>' + q.q + (q.nota ? '<br><span class="small muted">' + q.nota + '</span>' : '') + '</span>' + sn('gsn', q.id, r) +
          (q.opciones && r !== undefined && r !== 'no' ? '<div class="stack">' + guionOpciones(q, G.resp).map(o => '<button class="opt chica" data-gop="' + q.id + ':' + o.i + '" aria-pressed="' + (String(r) === String(o.i)) + '"><span class="tick">' + (String(r) === String(o.i) ? '✓' : '') + '</span>' + o.t + '</button>').join('') + '</div>' : '') + '</div>'; }).join('') : '') + '</div>'; }).join('');
  return '<div class="panel stack"><h3>Guion de consulta</h3><p class="small muted">Pregunte en orden; solo cuando la respuesta es "Sí" se abren las opciones de ese tema. El resultado se actualiza con cada respuesta.</p>' +
    '<div class="row">' + [['I','Va a iniciar el método'],['C','Ya lo usa y continúa']].map(([k, t]) => '<button class="btn seg ' + (G.momento === k ? '' : 'quiet') + '" data-gmomento="' + k + '">' + t + '</button>').join('') + '</div>' +
    '<div class="mecs">' + celdasMec(res) + '</div>' +
    '<p class="small muted">' + filas.length + ' condición(es) consideradas. * La guía pide leer la aclaración de esa categoría. Un valor como 3/4 depende de la gravedad.</p>' +
    '<div class="row"><button class="btn quiet" data-act="glimpiar">Nueva paciente</button><button class="btn quiet" data-obst="rueda">Ver la tabla completa de la OMS</button></div></div>' +
    posparto + grupos +
    '<p class="small muted">Fuente: ' + MEC.fuente + ' Con varias condiciones, la categoría mostrada es un mínimo y no reemplaza el juicio clínico. No incluye métodos de barrera, esterilización ni anticoncepción de emergencia.</p>';
}
function vRueda(){
  const R = S.rueda, res = mecEvaluar([...R.sel], R.momento);
  const celdas = celdasMec(res);
  const grupos = MEC.grupos.map((g, gi) => { const n = g.filas.filter((f, fi) => R.sel.has(gi + '.' + fi)).length, ab = R.abierto === gi;
    return '<div class="panel stack"><button class="acc" data-rgrupo="' + gi + '" aria-expanded="' + ab + '"><span>' + g.g + (n ? ' <span class="pill tag">' + n + '</span>' : '') + '</span><span aria-hidden="true">' + (ab ? '−' : '+') + '</span></button>' +
      (ab ? g.filas.map((f, fi) => { const id = gi + '.' + fi, on = R.sel.has(id); return '<button class="opt chica" data-rfila="' + id + '" aria-pressed="' + on + '"><span class="tick">' + (on ? '✓' : '') + '</span>' + f[0] + '</button>'; }).join('') : '') + '</div>'; }).join('');
  return '<div class="panel stack"><h3>Rueda de elegibilidad</h3><p class="small muted">Marque las condiciones de la paciente. Para cada método se muestra la categoría más restrictiva y qué condición la causa.</p>' +
    '<div class="row">' + [['I','Va a iniciar el método'],['C','Ya lo usa y continúa']].map(([k, t]) => '<button class="btn seg ' + (R.momento === k ? '' : 'quiet') + '" data-rmomento="' + k + '">' + t + '</button>').join('') + '</div>' +
    '<div class="mecs">' + celdas + '</div>' +
    '<p class="small muted">' + R.sel.size + ' condición(es) marcada(s). * La guía pide leer la aclaración de esa categoría en la tabla del método. Un valor como 3/4 depende de la gravedad.</p>' +
    '<div class="row"><button class="btn quiet" data-act="rprellenar">Usar las respuestas de la paciente</button><button class="btn quiet" data-act="rlimpiar">Limpiar</button></div></div>' +
    grupos +
    '<p class="small muted">Fuente: ' + MEC.fuente + ' Cuando hay varias condiciones, la guía pide valorarlas en conjunto: la categoría mostrada es un mínimo, no reemplaza el juicio clínico. No incluye métodos de barrera, esterilización ni anticoncepción de emergencia.</p>';
}
/* ----- Modo Rueda: anillo animado + guion pregunta a pregunta (mismas respuestas que el guion) ----- */
const TIEMPOS_ASIS = [['pre','Aún embarazada'],['48h','Menos de 48 horas'],['3sem','48 horas a 3 semanas'],['6sem','3 a 6 semanas'],['6m','6 semanas a 6 meses'],['mas','Más de 6 meses'],['no','No está en posparto']];
const ABREV = ['AOC', 'INY', 'PPS', 'DMPA', 'IMP', 'Cu', 'LNG'];
// Al responder "Sí", si por la edad solo queda una opción de detalle, se marca sola.
function unicaOpcion(qid, v){ if (v !== 'si') return v; const q = GUION.grupos.flatMap(g => g.preguntas).find(x => x.id === qid); if (!q || !q.opciones) return v; const ops = guionOpciones(q, S.guion.resp); return ops.length === 1 ? String(ops[0].i) : v; }
function temaActual(){ try { return localStorage.getItem('elijo-tema') || 'sistema'; } catch(e){ return 'sistema'; } }
function panelTema(){ return '<div class="panel stack"><h3>Apariencia</h3><div class="row">' + [['sistema','Como el teléfono'],['claro','Claro'],['oscuro','Oscuro']].map(([k, t]) => '<button class="btn seg chip ' + (temaActual() === k ? '' : 'quiet') + '" data-tema="' + k + '">' + t + '</button>').join('') + '</div></div>'; }
function pasosAsistente(){
  const G = S.guion, p = G.pos, pasos = [{tipo:'tiempo'}];
  const esPos = p.tiempo && p.tiempo !== 'no' && p.tiempo !== 'pre';
  if (esPos){
    pasos.push({tipo:'lacta'});
    if (!p.lacta && (p.tiempo === '48h' || p.tiempo === '3sem' || p.tiempo === '6sem')) pasos.push({tipo:'tev'});
    pasos.push({tipo:'sepsis'});
  }
  if (p.tiempo) for (const g of GUION.grupos) for (const q of g.preguntas) if (!q.soloGeneral || p.tiempo === 'no') pasos.push({tipo:'q', q, g});
  return pasos;
}
function anillo(res){
  const A = S.asis, n = res.length, seg = 100 / n, hueco = 1.2;
  const clase = r => r.rango >= 4 ? 'r4' : r.rango === 3 ? 'r3' : r.rango >= 1 ? 'r1' : 'r0';
  const cambios = A.prev ? res.map((r, i) => r.rango !== A.prev[i]) : res.map(() => false);
  A.prev = res.map(r => r.rango);
  const libres = res.filter(r => r.rango >= 1 && r.rango <= 2).length, conocidos = res.filter(r => r.rango >= 1).length;
  const sectores = res.map((r, i) => '<circle class="sector ' + clase(r) + (A.sel === i ? ' sel' : '') + (cambios[i] ? ' pulso' : '') + '" cx="100" cy="100" r="74" pathLength="100" stroke-dasharray="' + (seg - hueco) + ' ' + (100 - seg + hueco) + '" stroke-dashoffset="' + (25 - i * seg) + '" data-sector="' + i + '"/>').join('');
  const etiquetas = res.map((r, i) => { const ang = ((i + 0.5) * seg / 100) * 2 * Math.PI - Math.PI / 2, x = 100 + 74 * Math.cos(ang), y = 100 + 74 * Math.sin(ang);
    return '<text class="etq" x="' + x.toFixed(1) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="middle" data-sector="' + i + '">' + ABREV[i] + '</text>'; }).join('');
  const centro = conocidos ? '<text class="num" x="100" y="96" text-anchor="middle">' + libres + '</text><text class="sub" x="100" y="114" text-anchor="middle">de ' + n + ' sin restricción</text>' : '<text class="sub" x="100" y="96" text-anchor="middle">Responda el guion</text><text class="sub" x="100" y="110" text-anchor="middle">y la rueda se colorea</text>';
  return '<svg class="rueda" viewBox="0 0 200 200" role="img" aria-label="Rueda de elegibilidad: ' + libres + ' de ' + n + ' métodos sin restricción">' + sectores + etiquetas + centro + '</svg>';
}
function vAsistente(){
  const A = S.asis, G = S.guion, filas = guionFilas(G.resp, G.pos), res = mecEvaluar(filas, G.momento);
  const txt = ['Sin categoría todavía', 'Se puede usar', 'En general se puede usar', 'No se recomienda, salvo que no haya otro método', 'No usar'];
  const detalle = A.sel !== null && res[A.sel] ? '<div class="mec c' + res[A.sel].rango + '"><span class="mec-n">' + (res[A.sel].rango ? res[A.sel].texto + (res[A.sel].aclarar ? '*' : '') : '–') + '</span><span class="mec-t"><b>' + MEC.columnas[A.sel].t + '</b><br>' + txt[res[A.sel].rango] + (res[A.sel].rango >= 2 ? '<br><span class="small">Por: ' + res[A.sel].causas.join('; ') + '</span>' : '') + '</span></div>' : '<p class="small muted" style="text-align:center">Verde: categoría 1 o 2 · Ámbar: 3 · Rojo: 4. Toque un sector para ver el detalle.</p>';
  const leyenda = '<div class="leyenda">' + res.map((r, i) => '<button class="ley ' + (A.sel === i ? 'sel' : '') + '" data-sector="' + i + '"><i class="punto ' + (r.rango >= 4 ? 'r4' : r.rango === 3 ? 'r3' : r.rango >= 1 ? 'r1' : 'r0') + '"></i>' + ABREV[i] + ' <span class="muted">' + MEC.columnas[i].t.split(' (')[0] + '</span></button>').join('') + '</div>';
  const pasos = pasosAsistente(); if (A.i > pasos.length) A.i = pasos.length;
  const chipA = (val, actual, t, attr) => '<button class="btn seg chip ' + (actual === val ? '' : 'quiet') + '" data-asis="' + attr + '">' + t + '</button>';
  const grande = (attr, t, on) => '<button class="btn grande ' + (on ? '' : 'quiet') + '" data-asis="' + attr + '">' + t + '</button>';
  let tarjeta;
  if (A.i >= pasos.length){
    const sies = []; for (const g of GUION.grupos) for (const q of g.preguntas){ const r = G.resp[q.id]; if (r === undefined || r === 'no' || r === 'si') continue; sies.push(q.opciones ? q.q + ' → ' + (q.opciones[Number(r)] || {}).t : q.q); }
    for (const g of GUION.grupos) for (const q of g.preguntas) if (!q.opciones && G.resp[q.id] === 'si') sies.push(q.q);
    tarjeta = '<div class="paso"><p class="muted small">Guion completo</p><h3>Listo. La rueda refleja las respuestas.</h3>' + (sies.length ? '<p class="small">Respuestas con "Sí":</p><ul class="plain small">' + sies.map(x => '<li>' + x + '</li>').join('') + '</ul>' : '<p class="small muted">No se marcó ninguna condición.</p>') +
      '<div class="row"><button class="btn quiet" data-asis="ir:0">Revisar desde el inicio</button><button class="btn" data-act="asisnueva">Nueva paciente</button></div></div>';
  } else {
    const p = pasos[A.i], pos = G.pos; let cuerpo = '', titulo = '', grupo = '';
    if (p.tipo === 'tiempo'){ grupo = 'Situación posparto'; titulo = '¿Cuánto tiempo ha pasado desde el parto?'; cuerpo = '<div class="row">' + TIEMPOS_ASIS.map(([v, t]) => chipA(v, pos.tiempo, t, 'tiempo:' + v)).join('') + '</div>'; }
    else if (p.tipo === 'lacta'){ grupo = 'Situación posparto'; titulo = '¿Está dando de lactar?'; cuerpo = '<div class="row dos">' + grande('pos:lacta:no', 'No', pos.lacta === false && A.toc.lacta) + grande('pos:lacta:si', 'Sí', pos.lacta) + '</div>'; }
    else if (p.tipo === 'tev'){ grupo = 'Situación posparto'; titulo = 'Sin lactancia: ¿tiene otros factores de riesgo de trombosis?'; cuerpo = '<p class="small muted">Cesárea, transfusión, hemorragia, preeclampsia, obesidad, tabaco o inmovilidad.</p><div class="row dos">' + grande('pos:tev:no', 'No', !pos.tev && A.toc.tev) + grande('pos:tev:si', 'Sí', pos.tev) + '</div>'; }
    else if (p.tipo === 'sepsis'){ grupo = 'Situación posparto'; titulo = '¿Sepsis puerperal?'; cuerpo = '<div class="row dos">' + grande('pos:sepsis:no', 'No', !pos.sepsis && A.toc.sepsis) + grande('pos:sepsis:si', 'Sí', pos.sepsis) + '</div>'; }
    else {
      const q = p.q, r = G.resp[q.id]; grupo = p.g.g; titulo = q.q;
      if (q.tipo === 'una') cuerpo = '<div class="row">' + q.opciones.map((o, i) => chipA(String(i), r === undefined ? '' : String(r), o.t, 'op:' + q.id + ':' + i)).join('') + '</div>';
      else {
        cuerpo = (q.nota ? '<p class="small muted">' + q.nota + '</p>' : '') + '<div class="row dos">' + grande('sn:' + q.id + ':no', 'No', r === 'no') + grande('sn:' + q.id + ':si', 'Sí', r !== undefined && r !== 'no') + '</div>';
        if (q.opciones && r !== undefined && r !== 'no') cuerpo += '<p class="small muted">¿Cuál de estas?</p><div class="stack">' + guionOpciones(q, G.resp).map(o => '<button class="opt chica" data-asis="op:' + q.id + ':' + o.i + '" aria-pressed="' + (String(r) === String(o.i)) + '"><span class="tick">' + (String(r) === String(o.i) ? '✓' : '') + '</span>' + o.t + '</button>').join('') + '</div>';
      }
    }
    tarjeta = '<div class="paso' + (A.anim ? ' entra' : '') + '"><div class="progreso"><i style="width:' + Math.round(A.i / pasos.length * 100) + '%"></i></div><p class="muted small">' + grupo + ' · ' + (A.i + 1) + ' de ' + pasos.length + '</p><h3>' + titulo + '</h3>' + cuerpo +
      '<div class="row" style="justify-content:space-between"><button class="btn quiet" data-act="asisatras"' + (A.i === 0 ? ' disabled' : '') + '>Atrás</button><button class="btn quiet" data-act="asissig">' + (p.tipo === 'q' && (G.resp[p.q.id] === undefined) ? 'Omitir' : 'Siguiente') + '</button></div></div>';
  }
  A.anim = false;
  return '<div class="panel stack"><div class="row" style="justify-content:space-between"><h3>Rueda de elegibilidad</h3><span class="row" style="gap:4px">' + [['I','Inicia'],['C','Continúa']].map(([k, t]) => '<button class="btn seg chip ' + (G.momento === k ? '' : 'quiet') + '" data-gmomento="' + k + '">' + t + '</button>').join('') + '</span></div>' +
    anillo(res) + leyenda + detalle + '</div>' + tarjeta +
    '<p class="small muted"><button class="link" data-obst="guion" style="padding:0">Ver todas las preguntas en una lista</button> · <button class="link" data-obst="rueda" style="padding:0">Tabla completa de la OMS</button></p>' +
    '<p class="small muted">Fuente: ' + MEC.fuente + ' La categoría mostrada es un mínimo y no reemplaza el juicio clínico.</p>';
}
function vObstetra(){
  if (!S.guion.prellenado){ const p = posDesdePaciente(); if (p) S.guion.pos = p; S.guion.prellenado = true; }
  const d = dias(S.a, hoy), col = S.a.general ? 0 : S.a.embarazada ? 1 : d < 42 ? 1 : d < 183 ? 2 : 3;
  const seg = ['asistente','guion','tabla','laminas','lista','registro'].map((k, i) => '<button class="btn seg ' + (S.obst === k ? '' : 'quiet') + '" data-obst="' + k + '">' + ['Rueda','Guion','Posparto','Láminas','Consejería','Registro'][i] + '</button>').join('');
  let c = '';
  if (S.obst === 'tabla') c = '<div class="panel stack"><h3>Elegibilidad en mujeres que lactan</h3><div class="tablewrap"><table><thead><tr><th>Método</th><th>0 a 6 sem</th><th>6 sem a 6 m</th><th>Más de 6 m</th></tr></thead><tbody>' +
    TABLA.map(r => '<tr><td>' + r[0] + '</td>' + [1,2,3].map(i => '<td class="c c' + r[i][0] + (i === col ? ' now' : '') + '">' + r[i] + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' +
    '<p class="small muted">Categorías OMS: 1 y 2 se puede usar; 3 los riesgos suelen superar los beneficios; 4 no usar. La columna resaltada corresponde a la paciente actual (' + contexto() + ').</p><p class="small muted">Borrador según la 6.ª edición de los criterios de la OMS (2025). Cotejar con la guía completa antes de usar en consulta.</p></div>';
  if (S.obst === 'laminas') c = '<div class="stack">' + activos().map(m => '<button class="card" data-metodo="' + m.id + '" data-volver="obstetra">' + ico(m.id) + '<span class="body"><h3>' + m.nombre + '</h3><span class="muted small">' + m.apodo + '</span></span></button>').join('') + '</div>';
  if (S.obst === 'registro') c = vRegistro();
  if (S.obst === 'rueda') c = vRueda();
  if (S.obst === 'guion') c = vGuion();
  if (S.obst === 'asistente') c = vAsistente();
  if (S.obst === 'lista') c = '<div class="panel"><h3>Pasos de la consejería</h3>' + LISTA.map((t, i) => '<label class="check" for="chk' + i + '"><input type="checkbox" id="chk' + i + '" data-chk="' + i + '"' + (S.lista.includes(i) ? ' checked' : '') + '><span>' + t + '</span></label>').join('') + '<p class="small muted" style="padding-top:10px">' + S.lista.length + ' de ' + LISTA.length + ' pasos. No se guarda ningún dato de la paciente.</p></div>';
  return cabecera('<button class="link" data-go="resumen">Resumen de la paciente</button>') + '<div class="stack"><h2>Modo obstetra</h2><p class="muted">Apoyo visual para la consulta.</p></div><div class="row">' + seg + '</div>' + c + '<a class="btn quiet wide" href="/admin">Administración del contenido</a>';
}

/* ===== Render y eventos ===== */
const VISTAS = {motivo:vMotivo, referencias:vReferencias, inicio:vInicio, preguntas:vPreguntas, opciones:vOpciones, metodo:vMetodo, comparar:vComparar, mitos:vMitos, resumen:vResumen, ayuda:vAyuda, obstetra:vObstetra};
function render(){
  $('#app').innerHTML = VISTAS[S.vista]();
  const activa = S.vista === 'metodo' || S.vista === 'comparar' || S.vista === 'motivo' ? 'opciones' : S.vista;
  $('#tabs > div').innerHTML = Object.entries(TAB).map(([k, [t, p]]) => '<button data-go="' + k + '"' + (activa === k ? ' aria-current="page"' : '') + '><svg viewBox="0 0 24 24" aria-hidden="true">' + p + '</svg>' + t + '</button>').join('');
  $('#tabs').hidden = S.vista === 'inicio' || S.vista === 'preguntas';
}
function ir(v){ S.vista = v; render(); window.scrollTo(0, 0); }
let tt; function toast(t){ const e = $('#toast'); e.textContent = t; e.hidden = false; clearTimeout(tt); tt = setTimeout(() => e.hidden = true, 2200); }
function tomarFecha(){ const f = $('#f-nac'); if (f && f.value){ if (f.value > iso(hoy)) f.value = iso(hoy); S.a.nacimiento = f.value; S.a.embarazada = false; } }

document.addEventListener('click', ev => {
  const b = ev.target.closest('button'); if (!b) return;
  const d = b.dataset, a = S.a;
  if (d.go){ if (d.go === 'mitos'){ S.mitoVisto = false; } return ir(d.go); }
  if (d.metodo){ S.metodo = d.metodo; S.volver = d.volver || 'opciones'; return ir('metodo'); }
  if (d.set){ a[d.set] = d.v; return render(); }
  if (d.multi){ const l = a[d.multi], i = l.indexOf(d.v); i < 0 ? l.push(d.v) : l.splice(i, 1); return render(); }
  if (d.cmp){ const i = S.comparar.indexOf(d.cmp); if (i >= 0) S.comparar.splice(i, 1); else if (S.comparar.length < 3) S.comparar.push(d.cmp); else toast('Puedes comparar hasta 3 métodos'); return render(); }
  if (d.fav){ const i = S.favoritos.indexOf(d.fav); i < 0 ? S.favoritos.push(d.fav) : S.favoritos.splice(i, 1); guardar(); toast(i < 0 ? 'Añadido a tu resumen' : 'Quitado de tu resumen'); return render(); }
  if (d.duda || d.dudatxt){ const t = d.dudatxt || crudo(MITOS[+d.duda].q); if (!S.dudas.includes(t)) S.dudas.push(t); return toast('Guardada en tu resumen'); }
  if (d.temor){ S.temor = S.temor === +d.temor ? null : +d.temor; return render(); }
  if (d.motivo !== undefined) return elegirMotivo(d.motivo);
  if (d.tema){ aplicarTema(d.tema); return render(); }
  if (d.sector !== undefined){ S.asis.sel = S.asis.sel === +d.sector ? null : +d.sector; return render(); }
  if (d.asis){
    const A = S.asis, G = S.guion, partes = d.asis.split(':'), k = partes[0];
    const avanzar = () => { A.i++; A.anim = true; };
    if (k === 'tiempo'){ G.pos.tiempo = partes[1]; avanzar(); }
    else if (k === 'pos'){ G.pos[partes[1]] = partes[2] === 'si'; A.toc[partes[1]] = true; avanzar(); }
    else if (k === 'sn'){ const v = unicaOpcion(partes[1], partes[2]); G.resp[partes[1]] = v; const q = GUION.grupos.flatMap(g => g.preguntas).find(x => x.id === partes[1]); if (v !== 'si' || !q.opciones) avanzar(); }
    else if (k === 'op'){ G.resp[partes[1]] = partes[2]; avanzar(); }
    else if (k === 'ir'){ A.i = +partes[1]; A.anim = true; }
    return render();
  }
  if (d.gtiempo){ S.guion.pos.tiempo = d.gtiempo; return render(); }
  if (d.gpos){ const [k, v] = d.gpos.split(':'); S.guion.pos[k] = v === 'si'; return render(); }
  if (d.gsn){ const [q, v] = d.gsn.split(':'); S.guion.resp[q] = unicaOpcion(q, v); return render(); }
  if (d.gop){ const i = d.gop.lastIndexOf(':'); S.guion.resp[d.gop.slice(0, i)] = d.gop.slice(i + 1); return render(); }
  if (d.ggrupo !== undefined){ S.guion.grupo = S.guion.grupo === +d.ggrupo ? -1 : +d.ggrupo; return render(); }
  if (d.gmomento){ S.guion.momento = d.gmomento; return render(); }
  if (d.rgrupo !== undefined){ S.rueda.abierto = S.rueda.abierto === +d.rgrupo ? -1 : +d.rgrupo; return render(); }
  if (d.rfila){ const s = S.rueda.sel; s.has(d.rfila) ? s.delete(d.rfila) : s.add(d.rfila); return render(); }
  if (d.rmomento){ S.rueda.momento = d.rmomento; return render(); }
  if (d.regfase){ S.reg.fase = d.regfase; return render(); }
  if (d.regmet){ S.reg.metodo = d.regmet; return render(); }
  if (d.obst){ S.obst = d.obst; return render(); }
  switch (d.act){
    case 'empezar': S.paso = 0; a.general = false; S.plan = false; return ir('preguntas');
    case 'plan': S.paso = 0; a.general = false; a.embarazada = true; S.plan = true; return ir('preguntas');
    case 'registrar': return registrarConsejeria();
    case 'reintentar': vaciarCola().then(() => { toast(leerCola().length ? 'Siguen pendientes; revisa la conexión' : 'Todo enviado'); render(); }); return;
    case 'recargar': location.reload(); return;
    case 'asisatras': if (S.asis.i > 0){ S.asis.i--; S.asis.anim = true; } return render();
    case 'asissig': S.asis.i++; S.asis.anim = true; return render();
    case 'asisnueva': S.guion = {momento:'I', resp:{}, pos:{tiempo:'', lacta:false, tev:false, sepsis:false}, grupo:0, prellenado:true}; S.asis = {i:0, sel:null, prev:null, anim:true, toc:{}}; return render();
    case 'glimpiar': S.guion = {momento:'I', resp:{}, pos:{tiempo:'', lacta:false, tev:false, sepsis:false}, grupo:0, prellenado:true}; return render();
    case 'gprellenar': { const p = posDesdePaciente(); if (!p) return toast('La paciente aún no ha respondido el cuestionario'); S.guion.pos = p; toast('Situación posparto tomada de sus respuestas'); return render(); }
    case 'rprellenar': { const p = prellenarRueda(); if (!p.size) return toast('La paciente aún no ha respondido el cuestionario de posparto'); p.forEach(x => S.rueda.sel.add(x)); return render(); }
    case 'rlimpiar': S.rueda.sel.clear(); return render();
    case 'calendario': return calendario();
    case 'otrodato': S.dato++; return render();
    case 'copiarpareja': (navigator.clipboard ? navigator.clipboard.writeText(textoPareja()) : Promise.reject()).then(() => toast('Mensaje copiado'), () => toast('No se pudo copiar')); return;
    case 'guardarcodigo': {
      const v = $('#r-cod').value.trim(); if (v.length < 4) return toast('Escribe el código del establecimiento');
      enviar('/api/registro/centro', {codigo:v}).then(async res => {
        if (res.status === 403) return toast('Código no reconocido. Pide el código correcto a la administración.');
        const j = res.ok ? await res.json().catch(() => ({})) : {};
        S.codigo = v; S.centro = j.centro || ''; try { localStorage.setItem('elijo-codigo', v); localStorage.setItem('elijo-centro', S.centro); } catch(e){}
        toast(j.centro ? 'Código correcto: ' + j.centro : 'Código guardado'); render();
      }).catch(() => { S.codigo = v; S.centro = ''; try { localStorage.setItem('elijo-codigo', v); } catch(e){} toast('Sin señal: guardado, se comprobará al registrar'); render(); });
      return;
    }
    case 'olvidarcodigo': try { localStorage.removeItem('elijo-codigo'); localStorage.removeItem('elijo-centro'); } catch(e){} S.codigo = ''; S.centro = ''; return render();
    case 'general': S.paso = 0; S.plan = false; a.general = true; a.embarazada = false; return ir('preguntas');
    case 'embarazada': a.embarazada = !a.embarazada; return render();
    case 'atras': tomarFecha(); if (S.paso === 0) return ir('inicio'); S.paso--; return render();
    case 'sigue': {
      tomarFecha();
      if (pasos()[S.paso].k === 'nacimiento' && !a.embarazada && !a.nacimiento) return toast('Elige la fecha o marca que estás embarazada');
      if (S.paso >= pasos().length - 1){ a.ejemplo = false; guardar(); return ir('opciones'); }
      S.paso++; return render();
    }
    case 'oir': try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(d.txt); u.lang = 'es-EC'; speechSynthesis.speak(u); } catch(e){} return;
    case 'vermito': S.mitoVisto = true; return render();
    case 'otromito': { const on = mitosOn(); S.mito = on[(on.indexOf(S.mito) + 1) % on.length]; S.mitoVisto = false; return render(); }
    case 'limpiarcmp': S.comparar = []; return ir('opciones');
    case 'copiar': {
      const t = crudo(textoResumen());
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Resumen copiado'), () => toast('No se pudo copiar. Muestra esta pantalla en tu consulta.'));
      return;
    }
    case 'borrar': S.a = {...EJEMPLO, importa:['nodiario'], condiciones:[]}; S.favoritos = []; S.dudas = []; S.comparar = []; try { localStorage.removeItem('elijo'); } catch(e){} toast('Respuestas borradas'); return render();
  }
});
document.addEventListener('change', ev => {
  const c = ev.target.dataset && ev.target.dataset.chk;
  if (c !== undefined){ const n = +c, i = S.lista.indexOf(n); i < 0 ? S.lista.push(n) : S.lista.splice(i, 1); render(); }
  if (ev.target.id === 'f-nac' && ev.target.value){ if (ev.target.value > iso(hoy)){ ev.target.value = iso(hoy); toast('La fecha del parto no puede ser futura'); } S.a.nacimiento = ev.target.value; S.a.embarazada = false; render(); }
});
render();

}
cargarContenido().then(c => iniciar(sanear(c))).catch(() => {
  document.querySelector('#app').innerHTML = '<p>No se pudo cargar la app. Revisa tu conexión y vuelve a intentar.</p>';
});
function avisoVersion(){ const e = document.getElementById('toast'); e.innerHTML = 'Hay una versión nueva de Elijo. <button class="link" data-act="recargar">Actualizar</button>'; e.hidden = false; }
if ('serviceWorker' in navigator){
  navigator.serviceWorker.register('/sw.js').catch(() => {});
  // Cuando se publica una versión nueva, el teléfono que ya tenía la app abierta recibe un aviso para recargar.
  let habia = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!habia){ habia = true; return; } avisoVersion(); });
}
