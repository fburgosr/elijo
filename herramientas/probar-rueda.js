// Comprueba la tabla de la rueda de elegibilidad: formato de cada celda y casos conocidos de la guía OMS 2025.
// Uso: node herramientas/probar-rueda.js
global.window = {};
require('../rueda.js');
const { MEC, mecEvaluar } = window;
let fallos = 0;
const ok = (nombre, cond) => { console.log((cond ? 'ok   ' : 'FALLA ') + nombre); if (!cond) fallos++; };

const celda = /^(-|D1N2\*?|[1-4](\/[1-4])?\*?(\|[1-4](\/[1-4])?\*?)?)$/;
let filas = 0, malas = [];
MEC.grupos.forEach(g => g.filas.forEach(f => {
  filas++;
  const c = f[1].split(' ');
  if (c.length !== 7 || c.some(x => !celda.test(x))) malas.push(f[0]);
}));
ok(`las ${filas} filas tienen 7 celdas con formato válido`, malas.length === 0);
if (malas.length) console.log(malas);
const nombres = MEC.grupos.flatMap(g => g.filas.map(f => f[0]));
ok('no hay condiciones repetidas', new Set(nombres).size === nombres.length);

const id = t => { for (let g = 0; g < MEC.grupos.length; g++) { const f = MEC.grupos[g].filas.findIndex(x => x[0] === t); if (f >= 0) return g + '.' + f; } throw new Error('No existe: ' + t); };
const cat = (condiciones, momento = 'I') => mecEvaluar(condiciones.map(id), momento).map(r => r.rango ? r.texto : '-').join(' ');

// Casos leídos directamente de la tabla resumen (páginas 159 a 175 de la guía).
ok('lactancia < 6 semanas', cat(['Lactancia: menos de 6 semanas posparto']) === '4 4 2 2 2 - -');
ok('DIU 48 h a 4 semanas', cat(['Inserción de DIU: de 48 horas a menos de 4 semanas']) === '- - - - - 3 3');
ok('migraña con aura, inicio', cat(['Migraña con aura, a cualquier edad']) === '4 4 2 2 2 1 2');
ok('migraña con aura, continuación', cat(['Migraña con aura, a cualquier edad'], 'C') === '4 4 3 3 3 1 2');
ok('cáncer de mama actual', cat(['Cáncer de mama actual']) === '4 4 4 4 4 1 4');
ok('fuma, 35 o más, 15 o más cigarrillos', cat(['Fuma: 35 años o más, 15 cigarrillos o más al día']) === '4 3 1 1 1 1 1');
ok('rifampicina', cat(['Rifampicina o rifabutina']) === '3 2 3 DMPA 1 · NET-EN 2 2 1 1');
ok('cáncer de endometrio: DIU inicio 4, continuación 2', cat(['Cáncer de endometrio']) === '1 1 1 1 1 4 4' && cat(['Cáncer de endometrio'], 'C') === '1 1 1 1 1 2 2');
// Combinación: queda la más restrictiva de cada columna.
ok('lactancia 6 semanas a 6 meses + presión 160/100', cat(['Lactancia: 6 semanas a menos de 6 meses (lactancia predominante)', 'Presión elevada: sistólica de 160 o más, o diastólica de 100 o más mm Hg']) === '4 4 2 3 2 1 2');
const r = mecEvaluar([id('Lactancia: 6 meses o más posparto'), id('Diabetes con nefropatía, retinopatía o neuropatía')], 'I');
ok('la causa de la categoría más alta se informa', r[0].texto === '3/4' && r[0].causas.length === 1 && r[0].causas[0].startsWith('Diabetes'));
ok('sin condiciones no hay categoría', mecEvaluar([], 'I').every(x => x.rango === 0));

// Guion de consulta: cada opción apunta a filas que existen; la situación posparto produce las filas correctas.
require('../guion.js');
const { GUION, guionFilas, guionPosparto } = window;
const existe = id => { const [g, f] = id.split('.').map(Number); return !!(MEC.grupos[g] && MEC.grupos[g].filas[f]); };
const refs = GUION.grupos.flatMap(g => g.preguntas.flatMap(q => q.opciones ? q.opciones.flatMap(o => o.filas) : q.filas));
ok(`las ${refs.length} referencias del guion apuntan a filas existentes`, refs.every(existe));
const idsPreg = GUION.grupos.flatMap(g => g.preguntas.map(q => q.id));
ok('no hay preguntas repetidas en el guion', new Set(idsPreg).size === idsPreg.length);
ok('posparto: 3 semanas con lactancia', guionPosparto({ tiempo: '6sem', lacta: true }).join(' ') === '0.0 0.11');
ok('posparto: 10 días sin lactancia con riesgo de trombosis', guionPosparto({ tiempo: '3sem', lacta: false, tev: true }).join(' ') === '0.4 0.10');
ok('posparto: primeras 48 horas con lactancia y sepsis', guionPosparto({ tiempo: '48h', lacta: true, sepsis: true }).join(' ') === '0.0 0.8 0.12');
ok('fuera del posparto no se añaden filas de posparto', guionPosparto({ tiempo: 'no' }).length === 0);
const filasGuion = guionFilas({ edad: '2', hta: '2', cefalea: 'no', lupus: 'si' }, { tiempo: '6m', lacta: true });
ok('las respuestas del guion se convierten en filas', filasGuion.join(' ') === '0.1 0.11 1.3 2.4');
ok('guion: lactancia 6 semanas a 6 meses + presión 160/100 da 4 4 2 3 2 1 2', mecEvaluar(filasGuion, 'I').map(r => r.rango).join(' ') === '4 4 2 3 2 1 2');
console.log(fallos ? fallos + ' prueba(s) fallaron' : 'Todas las pruebas de la rueda pasaron');
process.exit(fallos ? 1 : 0);
