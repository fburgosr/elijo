# Genera public/ y contenido.inicial.json a partir de prototipo/elijo.html.
# Se ejecuta una sola vez al crear la app; después el código de public/ se mantiene a mano.
import json, re, subprocess, sys, pathlib

RAIZ = pathlib.Path(__file__).resolve().parents[2]
APP = RAIZ / 'app'
PUB = APP / 'public'
PUB.mkdir(parents=True, exist_ok=True)
html = (RAIZ / 'prototipo' / 'elijo.html').read_text(encoding='utf-8')

css = html.split('<style>')[1].split('</style>')[0].strip()
js = html.split('<script>')[1].split('</script>')[0]


def una(patron, nuevo, texto, flags=re.S):
    res, n = re.subn(patron, lambda m: nuevo, texto, count=1, flags=flags)
    if n != 1:
        sys.exit('No se encontró: ' + patron[:60])
    return res


def literal(viejo, nuevo, texto):
    if texto.count(viejo) != 1:
        sys.exit('Se esperaba una coincidencia: ' + viejo[:60])
    return texto.replace(viejo, nuevo)


# 1. Semilla de contenido: se evalúa el prototipo con Node y se exportan sus constantes.
semilla_js = (
    "const el={innerHTML:'',hidden:false};const document={querySelector:()=>el,addEventListener(){}};"
    "const window={scrollTo(){}};const localStorage={getItem:()=>null,setItem(){},removeItem(){}};const navigator={};"
    + js +
    ";const al=[...VISTAS.ayuda().matchAll(/<li>(.*?)<\\/li>/g)].map(m=>m[1]);"
    "process.stdout.write(JSON.stringify({version:'1.0',fecha:CFG.fecha,"
    "metodos:METODOS.map(m=>({...m,activo:CFG.metodos[m.id].activo,msp:CFG.metodos[m.id].msp})),"
    "mitos:MITOS.map(m=>({...m,activo:true})),temores:TEMORES.map(t=>({...t,activo:true})),"
    "videos:[],alarmas:al,refs:REFS},null,1));"
)
tmp = APP / 'herramientas' / '_semilla.tmp.js'
tmp.write_text(semilla_js, encoding='utf-8')
semilla = subprocess.run(['node', str(tmp)], capture_output=True, text=True, encoding='utf-8')
tmp.unlink()
if semilla.returncode:
    sys.exit(semilla.stderr)
json.loads(semilla.stdout)
(APP / 'contenido.inicial.json').write_text(semilla.stdout, encoding='utf-8', newline='\n')

# 2. Código de la app: las constantes de contenido pasan a venir del servidor.
js = una(r"const METODOS = \[.*?\n\];\nconst CONDICIONES", "const METODOS = C.metodos;\nconst CONDICIONES", js)
js = una(r"const MITOS = \[.*?\n\];\n", "const MITOS = C.mitos;\n", js)
js = una(
    r"/\* ===== Configuración.*?try \{ CFG = aplicarCfg\(.*?\n",
    """/* ===== Contenido publicado por la administración ===== */
const TEMORES = C.temores, REFS = C.refs;
const CFG = {version:C.version, fecha:C.fecha, metodos:Object.fromEntries(METODOS.map(m => [m.id, {activo:!!m.activo, msp:!!m.msp}])), mitos:MITOS.map(m => m.activo !== false), temores:TEMORES.map(t => t.activo !== false), videos:C.videos || []};
const activos = () => METODOS.filter(m => CFG.metodos[m.id].activo);
const melaOn = () => !!(CFG.metodos.mela && CFG.metodos.mela.activo);
const mitosOn = () => MITOS.map((m, i) => i).filter(i => CFG.mitos[i]);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const crudo = s => { const t = document.createElement('textarea'); t.innerHTML = s; return t.value; };
const videosDe = id => CFG.videos.filter(v => v.m === id);
const linkVideo = v => '<a class="btn quiet wide video" href="' + esc(v.url) + '" target="_blank" rel="noopener">Ver video: ' + esc(v.t) + '</a>';
const alarmasHtml = '<ul class="plain">' + C.alarmas.map(x => '<li>' + x + '</li>').join('') + '</ul>';
""", js)
js = una(r"function vAjustes\(\)\{.*?\n\}\nfunction vObstetra", "function vObstetra", js)
js = literal("['tabla','laminas','lista','ajustes']", "['tabla','laminas','lista']", js)
js = literal("['Criterios','Láminas','Consejería','Ajustes']", "['Criterios','Láminas','Consejería']", js)
js = literal("  if (S.obst === 'ajustes') c = vAjustes();\n", "", js)
js = literal("<div class=\"row\">' + seg + '</div>' + c;", "<div class=\"row\">' + seg + '</div>' + c + '<a class=\"btn quiet wide\" href=\"/admin\">Administración del contenido</a>';", js)
js = una(r"  if \(d\.tog\)\{.*?guardarCfg\(\); return render\(\); \}\n  if \(d\.delvideo\)\{.*?\}\n", "", js)
js = una(r"    case 'addvideo': \{.*?case 'resetcfg':.*?\n", "", js)
js = una(r"<ul class=\"plain\"><li>Sangrado.*?</ul>", "' + alarmasHtml + '", js)
js = literal("La obstetra los añade en Modo obstetra, Ajustes.", "Pronto habrá videos aquí.", js)
js = literal("'<p class=\"small muted\">Qué dato está verificado con cada fuente se detalla en Modo obstetra, Ajustes.</p>'", "''", js)
js = literal("No hay tarjetas activas. Se activan en Ajustes.", "", js) if "No hay tarjetas activas" in js else js
js = literal("Prototipo. El contenido clínico es un borrador y no reemplaza la consulta con tu obstetra.", "Esta app no reemplaza la consulta con tu obstetra.", js)
js = literal("const t = d.dudatxt || MITOS[+d.duda].q;", "const t = d.dudatxt || crudo(MITOS[+d.duda].q);", js)
js = literal("S.dudas.map(t => '<li>' + t + '</li>')", "S.dudas.map(t => '<li>' + esc(t) + '</li>')", js)
js = literal("const t = textoResumen();", "const t = crudo(textoResumen());", js)
js = literal("data-dudatxt=\"' + t.q + '\"", "data-dudatxt=\"' + t.q + '\"", js)

app_js = """/* Elijo: consejería anticonceptiva. El contenido llega del servidor; las reglas clínicas viven en este archivo. */
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
""" + js + """
}
cargarContenido().then(c => iniciar(sanear(c))).catch(() => {
  document.querySelector('#app').innerHTML = '<p>No se pudo cargar la app. Revisa tu conexión y vuelve a intentar.</p>';
});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
"""
(PUB / 'app.js').write_text(app_js, encoding='utf-8', newline='\n')
(PUB / 'estilos.css').write_text(css + '\n', encoding='utf-8', newline='\n')
print('ok')
