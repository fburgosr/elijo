// Tema claro, oscuro o el del teléfono. Se carga antes que la app para que no parpadee al abrir.
window.aplicarTema = function(t){
  try { if (t === 'sistema') localStorage.removeItem('elijo-tema'); else localStorage.setItem('elijo-tema', t); } catch(e){}
  var h = document.documentElement;
  if (t === 'claro') h.setAttribute('data-theme', 'light'); else if (t === 'oscuro') h.setAttribute('data-theme', 'dark'); else h.removeAttribute('data-theme');
};
try { var t = localStorage.getItem('elijo-tema'); if (t === 'claro' || t === 'oscuro') window.aplicarTema(t); } catch(e){}
