/* Guion de consulta para la obstetra: preguntas de cribado agrupadas por tema. Cada respuesta "Sí" abre las opciones
   de detalle de ese tema; cada opción apunta a una o más filas de la tabla resumen de la OMS 2025 (rueda.js).
   La evaluación la hace mecEvaluar con las filas seleccionadas, igual que la rueda. */
window.GUION = {
  grupos: [
    {id: 'general', g: 'Datos generales', preguntas: [
      {id: 'edad', q: '¿Qué edad tiene?', tipo: 'una', opciones: [
        {t: 'Menos de 18 años', filas: ['1.1']}, {t: '18 a 19 años', filas: ['1.2']}, {t: '20 a 39 años', filas: ['1.3']},
        {t: '40 a 45 años', filas: ['1.4']}, {t: 'Más de 45 años', filas: ['1.5']}]},
      {id: 'fuma', q: '¿Fuma?', opciones: [
        {t: 'Sí, y tiene menos de 35 años', filas: ['1.13']}, {t: 'Sí, 35 años o más, menos de 15 cigarrillos al día', filas: ['1.14']},
        {t: 'Sí, 35 años o más, 15 cigarrillos o más al día', filas: ['1.15']}]},
      {id: 'imc', q: '¿Tiene obesidad (IMC de 30 o más)?', opciones: [
        {t: 'Sí, y tiene 18 años o más', filas: ['1.16']}, {t: 'Sí, y tiene menos de 18 años', filas: ['1.17']}]},
      {id: 'partos', q: '¿Nunca ha tenido un parto?', filas: ['1.6'], soloGeneral: true},
      {id: 'aborto', q: '¿Acaba de tener un aborto?', soloGeneral: true, opciones: [
        {t: 'Sí, del primer trimestre', filas: ['1.8']}, {t: 'Sí, del segundo trimestre', filas: ['1.9']}, {t: 'Sí, y fue séptico', filas: ['1.10']}]},
      {id: 'ectopico', q: '¿Ha tenido un embarazo ectópico?', filas: ['1.11']}
    ]},
    {id: 'cardio', g: 'Presión arterial, corazón y trombosis', preguntas: [
      {id: 'hta', q: '¿Tiene o ha tenido presión alta?', opciones: [
        {t: 'Controlada con tratamiento; hoy la presión es normal', filas: ['2.2']},
        {t: 'Hoy: sistólica 140 a 159 o diastólica 90 a 99', filas: ['2.3']},
        {t: 'Hoy: sistólica 160 o más, o diastólica 100 o más', filas: ['2.4']},
        {t: 'Con daño vascular (riñón, ojos, corazón)', filas: ['2.5']},
        {t: 'Antecedente, pero hoy no se puede medir', filas: ['2.1']},
        {t: 'Solo durante el embarazo; hoy la presión es normal', filas: ['2.6']}]},
      {id: 'tvp', q: '¿Ha tenido trombosis en una pierna o embolia pulmonar?', opciones: [
        {t: 'Sí, hace tiempo (antecedente)', filas: ['2.7']}, {t: 'Sí, actual o reciente', filas: ['2.8']}, {t: 'Sí, y toma anticoagulantes', filas: ['2.9']}]},
      {id: 'tvpfam', q: '¿Padre, madre, hermano o hermana con trombosis?', filas: ['2.10']},
      {id: 'cirugia', q: '¿Cirugía mayor reciente o próxima?', opciones: [
        {t: 'Con reposo prolongado en cama', filas: ['2.11']}, {t: 'Sin reposo prolongado', filas: ['2.12']}]},
      {id: 'corazon', q: '¿Infarto, angina, accidente cerebrovascular o enfermedad de las válvulas del corazón?', opciones: [
        {t: 'Infarto o angina (cardiopatía isquémica)', filas: ['2.17']}, {t: 'Accidente cerebrovascular', filas: ['2.18']},
        {t: 'Valvulopatía no complicada', filas: ['2.20']}, {t: 'Valvulopatía complicada (hipertensión pulmonar, fibrilación, endocarditis)', filas: ['2.21']}]},
      {id: 'riesgos', q: '¿Reúne varios factores de riesgo cardiovascular a la vez (edad mayor, tabaco, diabetes, hipertensión, colesterol alto)?', filas: ['2.0']},
      {id: 'lipidos', q: '¿Colesterol o triglicéridos altos conocidos?', filas: ['2.19']},
      {id: 'trombofilia', q: '¿Trombofilia conocida (factor V Leiden, protrombina, proteína S, C o antitrombina)?', filas: ['2.14']},
      {id: 'venas', q: '¿Várices o trombosis venosa superficial?', opciones: [{t: 'Várices', filas: ['2.15']}, {t: 'Trombosis venosa superficial', filas: ['2.16']}]}
    ]},
    {id: 'neuro', g: 'Dolor de cabeza, epilepsia, lupus y ánimo', preguntas: [
      {id: 'cefalea', q: '¿Dolores de cabeza frecuentes o migraña?', opciones: [
        {t: 'Migraña con aura (ve luces o destellos antes del dolor)', filas: ['4.3']},
        {t: 'Migraña sin aura, menos de 35 años', filas: ['4.1']}, {t: 'Migraña sin aura, 35 años o más', filas: ['4.2']},
        {t: 'Dolor de cabeza común, no migraña', filas: ['4.0']}]},
      {id: 'epilepsia', q: '¿Epilepsia?', filas: ['4.4'], nota: 'Si toma anticonvulsivantes, respóndalo también en Medicamentos.'},
      {id: 'lupus', q: '¿Lupus?', opciones: [
        {t: 'Con anticuerpos antifosfolípidos positivos o desconocidos', filas: ['3.0']}, {t: 'Con trombocitopenia grave', filas: ['3.1']},
        {t: 'Con tratamiento inmunosupresor', filas: ['3.2']}, {t: 'Sin ninguna de las anteriores', filas: ['3.3']}]},
      {id: 'depresion', q: '¿Depresión diagnosticada?', filas: ['4.5']}
    ]},
    {id: 'gine', g: 'Sangrado, útero, infecciones y mama', preguntas: [
      {id: 'sangrado', q: '¿Sangrado vaginal fuera de lo normal?', opciones: [
        {t: 'Irregular, sin ser abundante', filas: ['5.0']}, {t: 'Abundante o prolongado', filas: ['5.1']},
        {t: 'Sin explicación, sospechoso de algo grave, aún sin evaluar', filas: ['5.2']}]},
      {id: 'utero', q: '¿Miomas, anomalía del útero, endometriosis o dismenorrea grave?', opciones: [
        {t: 'Miomas sin distorsión de la cavidad', filas: ['5.18']}, {t: 'Miomas con distorsión de la cavidad', filas: ['5.19']},
        {t: 'Anomalía anatómica que distorsiona la cavidad', filas: ['5.20']}, {t: 'Anomalía anatómica sin distorsión', filas: ['5.21']},
        {t: 'Endometriosis', filas: ['5.3']}, {t: 'Dismenorrea grave', filas: ['5.5']}]},
      {id: 'infeccion', q: '¿Infección pélvica, cervicitis o infección de transmisión sexual?', opciones: [
        {t: 'Enfermedad pélvica inflamatoria actual', filas: ['5.24']}, {t: 'Cervicitis purulenta, clamidia o gonorrea actual', filas: ['5.25']},
        {t: 'Otra infección de transmisión sexual', filas: ['5.26']}, {t: 'Vaginitis', filas: ['5.27']},
        {t: 'Sin infección actual, pero mayor riesgo', filas: ['5.28']},
        {t: 'Enfermedad pélvica pasada, con embarazo después', filas: ['5.22']}, {t: 'Enfermedad pélvica pasada, sin embarazo después', filas: ['5.23']}]},
      {id: 'mama', q: '¿Algún problema en las mamas?', opciones: [
        {t: 'Cáncer de mama actual', filas: ['5.14']}, {t: 'Cáncer de mama pasado, sin enfermedad hace 5 años', filas: ['5.15']},
        {t: 'Masa o nódulo sin diagnóstico', filas: ['5.11']}, {t: 'Enfermedad benigna', filas: ['5.12']}, {t: 'Solo antecedente familiar de cáncer', filas: ['5.13']}]},
      {id: 'cancergine', q: '¿Cáncer o lesión en cuello uterino, endometrio u ovario, o enfermedad trofoblástica?', opciones: [
        {t: 'Lesión precancerosa del cuello (NIC)', filas: ['5.9']}, {t: 'Cáncer cervicouterino', filas: ['5.10']},
        {t: 'Cáncer de endometrio', filas: ['5.16']}, {t: 'Cáncer de ovario', filas: ['5.17']},
        {t: 'Enfermedad trofoblástica con β-hCG en descenso', filas: ['5.6']}, {t: 'Enfermedad trofoblástica con β-hCG elevada o maligna', filas: ['5.7']},
        {t: 'Quiste o tumor ovárico benigno', filas: ['5.4']}]}
    ]},
    {id: 'metab', g: 'Diabetes, tiroides, hígado y anemia', preguntas: [
      {id: 'diabetes', q: '¿Diabetes?', opciones: [
        {t: 'Solo gestacional, en un embarazo anterior', filas: ['7.0']}, {t: 'Sin daño vascular, sin insulina', filas: ['7.1']},
        {t: 'Sin daño vascular, con insulina', filas: ['7.2']}, {t: 'Con daño en riñón, ojos o nervios', filas: ['7.3']},
        {t: 'Con otra enfermedad vascular o más de 20 años de diabetes', filas: ['7.4']}]},
      {id: 'tiroides', q: '¿Problema de tiroides?', filas: ['7.5']},
      {id: 'higado', q: '¿Enfermedad del hígado o de la vesícula?', opciones: [
        {t: 'Hepatitis viral aguda o en brote', filas: ['8.6']}, {t: 'Hepatitis viral: portadora o crónica', filas: ['8.7']},
        {t: 'Cirrosis leve (compensada)', filas: ['8.8']}, {t: 'Cirrosis grave (descompensada)', filas: ['8.9']},
        {t: 'Tumor hepático benigno: hiperplasia nodular focal', filas: ['8.10']}, {t: 'Tumor hepático benigno: adenoma', filas: ['8.11']},
        {t: 'Tumor hepático maligno', filas: ['8.12']},
        {t: 'Vesícula: enfermedad sintomática actual', filas: ['8.2']}, {t: 'Vesícula: en tratamiento médico', filas: ['8.1']},
        {t: 'Vesícula: operada (colecistectomía)', filas: ['8.0']}, {t: 'Vesícula: sin síntomas', filas: ['8.3']},
        {t: 'Colestasis en un embarazo', filas: ['8.4']}, {t: 'Colestasis por anticonceptivos combinados', filas: ['8.5']}]},
      {id: 'anemia', q: '¿Anemia?', opciones: [{t: 'Drepanocítica (células falciformes)', filas: ['8.14']}, {t: 'Talasemia', filas: ['8.13']}, {t: 'Por falta de hierro', filas: ['8.15']}]}
    ]},
    {id: 'infec', g: 'VIH, tuberculosis y medicamentos', preguntas: [
      {id: 'vih', q: '¿Vive con VIH o tiene alto riesgo?', opciones: [
        {t: 'Alto riesgo, sin infección', filas: ['6.0']}, {t: 'VIH sin síntomas o enfermedad leve', filas: ['6.1']}, {t: 'VIH grave o avanzado', filas: ['6.2']}]},
      {id: 'arv', q: '¿Toma antirretrovirales o profilaxis preexposición?', opciones: [
        {t: 'Abacavir, zidovudina, lamivudina, didanosina o emtricitabina', filas: ['9.0']}, {t: 'Efavirenz', filas: ['9.1']},
        {t: 'Etravirina, nevirapina o rilpivirina', filas: ['9.2']}, {t: 'Inhibidores de la proteasa (con ritonavir)', filas: ['9.3']},
        {t: 'Inhibidores de la integrasa (raltegravir, dolutegravir)', filas: ['9.4']}, {t: 'Profilaxis preexposición', filas: ['9.5']}]},
      {id: 'tb', q: '¿Tuberculosis?', opciones: [{t: 'No pélvica', filas: ['6.4']}, {t: 'Pélvica', filas: ['6.5']}]},
      {id: 'anticonv', q: '¿Toma anticonvulsivantes?', opciones: [
        {t: 'Fenitoína, carbamazepina, barbitúricos, primidona, topiramato u oxcarbazepina', filas: ['9.6']}, {t: 'Lamotrigina', filas: ['9.7']}]},
      {id: 'rifampicina', q: '¿Toma rifampicina o rifabutina?', filas: ['9.9']}
    ]}
  ]
};

/* Filas de la tabla OMS que corresponden a la situación posparto, a partir de tres datos de la consulta. */
window.guionPosparto = function (p) {
  // p: {tiempo: 'pre'|'48h'|'3sem'|'6sem'|'6m'|'mas'|'no', lacta: true|false, tev: true|false, sepsis: true|false}
  const f = [];
  if (!p || !p.tiempo || p.tiempo === 'no' || p.tiempo === 'pre') return f;
  const t = p.tiempo;
  if (p.lacta) f.push(t === '48h' || t === '3sem' || t === '6sem' ? '0.0' : t === '6m' ? '0.1' : '0.2');
  else if (t === '48h' || t === '3sem') f.push(p.tev ? '0.4' : '0.3');
  else if (t === '6sem') f.push(p.tev ? '0.6' : '0.5');
  else f.push('0.7');
  if (t === '48h') f.push(p.lacta ? '0.8' : '0.9'); else if (t === '3sem') f.push('0.10'); else f.push('0.11');
  if (p.sepsis) f.push('0.12');
  return f;
};

/* Convierte las respuestas del guion en filas: resp[idPregunta] = 'no' | 'si' | índice de la opción elegida. */
window.guionFilas = function (resp, posparto) {
  const f = window.guionPosparto(posparto);
  for (const g of window.GUION.grupos) for (const q of g.preguntas) {
    const r = resp[q.id];
    if (r === undefined || r === 'no' || r === '') continue;
    if (q.opciones) { const o = q.opciones[Number(r)]; if (o) f.push(...o.filas); }
    else if (r === 'si') f.push(...q.filas);
  }
  return [...new Set(f)];
};
