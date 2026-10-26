/* Criterios médicos de elegibilidad de la OMS, 6.ª edición (2025), tabla resumen 5.12 (páginas 159 a 175).
   Transcripción de la guía original. Es contenido clínico: cualquier cambio exige cotejar con la guía y revisión de obstetricia.

   Cada fila: [condición, "AOC  INY-COMB  PPS  DMPA/NET-EN  IMPLANTE  DIU-Cu  DIU-LNG"].
   Notación de cada celda:
     1 2 3 4   categoría para inicio y continuación
     2|3       inicio | continuación
     3/4       la categoría depende de la gravedad
     D1N2      DMPA = 1, NET-EN = 2
     -         la guía no asigna categoría (no aplica)
     *         la guía pide leer la aclaración en la tabla del método (sección 5) */
window.MEC = {
  fuente: 'OMS. Medical eligibility criteria for contraceptive use, 6.ª ed. Ginebra; 2025. Tabla resumen 5.12.',
  columnas: [
    {id: 'aoc', t: 'Píldora, parche o anillo combinados', metodo: 'combi'},
    {id: 'aic', t: 'Inyectable combinado (mensual)', metodo: 'combi'},
    {id: 'pps', t: 'Píldora de solo progestágeno', metodo: 'pop'},
    {id: 'dmpa', t: 'Inyectable de solo progestágeno (DMPA, NET-EN)', metodo: 'dmpa'},
    {id: 'imp', t: 'Implante', metodo: 'implante'},
    {id: 'cu', t: 'DIU de cobre', metodo: 'diu_cu'},
    {id: 'lng', t: 'DIU con levonorgestrel', metodo: 'diu_lng'}
  ],
  grupos: [
    {g: 'Posparto y lactancia', filas: [
      ['Lactancia: menos de 6 semanas posparto', '4 4 2 2 2 - -'],
      ['Lactancia: 6 semanas a menos de 6 meses (lactancia predominante)', '3 3 1 1 1 - -'],
      ['Lactancia: 6 meses o más posparto', '2 2 1 1 1 - -'],
      ['Sin lactancia: menos de 21 días, sin otros factores de riesgo de tromboembolismo venoso', '3* 3* 1 1 1 - -'],
      ['Sin lactancia: menos de 21 días, con otros factores de riesgo de tromboembolismo venoso', '4* 4* 1 1 1 - -'],
      ['Sin lactancia: 21 a 42 días, sin otros factores de riesgo de tromboembolismo venoso', '2* 2* 1 1 1 - -'],
      ['Sin lactancia: 21 a 42 días, con otros factores de riesgo de tromboembolismo venoso', '3* 3* 1 1 1 - -'],
      ['Sin lactancia: más de 42 días', '1 1 1 1 1 - -'],
      ['Inserción de DIU: menos de 48 horas posparto, con lactancia', '- - - - - 1 2'],
      ['Inserción de DIU: menos de 48 horas posparto, sin lactancia', '- - - - - 1 1'],
      ['Inserción de DIU: de 48 horas a menos de 4 semanas', '- - - - - 3 3'],
      ['Inserción de DIU: 4 semanas o más', '- - - - - 1 1'],
      ['Sepsis puerperal', '- - - - - 4 4']
    ]},
    {g: 'Características personales y antecedentes reproductivos', filas: [
      ['Embarazo', '- - - - - 4 4'],
      ['Edad: de la menarquia a menos de 18 años', '1 1 1 2 1 2 2'],
      ['Edad: 18 a 19 años', '1 1 1 1 1 2 2'],
      ['Edad: 20 a 39 años', '1 1 1 1 1 1 1'],
      ['Edad: 40 a 45 años', '2 2 1 1 1 1 1'],
      ['Edad: más de 45 años', '2 2 1 2 1 1 1'],
      ['Nulípara', '1 1 1 1 1 2 2'],
      ['Con partos previos', '1 1 1 1 1 1 1'],
      ['Posaborto: primer trimestre', '1 1 1 1 1 1 1'],
      ['Posaborto: segundo trimestre', '1 1 1 1 1 2 2'],
      ['Posaborto: inmediatamente después de un aborto séptico', '1 1 1 1 1 4 4'],
      ['Embarazo ectópico previo', '1 1 2 1 1 1 1'],
      ['Antecedente de cirugía pélvica', '1 1 1 1 1 1 1'],
      ['Fuma: menos de 35 años', '2 2 1 1 1 1 1'],
      ['Fuma: 35 años o más, menos de 15 cigarrillos al día', '3 2 1 1 1 1 1'],
      ['Fuma: 35 años o más, 15 cigarrillos o más al día', '4 3 1 1 1 1 1'],
      ['Obesidad: IMC de 30 o más', '2 2 1 1 1 1 1'],
      ['Obesidad: de la menarquia a menos de 18 años e IMC de 30 o más', '2 2 1 2* 1 1 1']
    ]},
    {g: 'Enfermedad cardiovascular', filas: [
      ['Múltiples factores de riesgo de enfermedad arterial (edad mayor, tabaco, diabetes, hipertensión, dislipidemia)', '3/4* 3/4* 2* 3* 2* 1 2'],
      ['Hipertensión: antecedente, sin poder medir la presión (incluye hipertensión en el embarazo)', '3* 3* 2* 2* 2* 1 2'],
      ['Hipertensión: controlada adecuadamente, con presión medible', '3* 3* 1* 2* 1* 1 1'],
      ['Presión elevada: sistólica 140 a 159 o diastólica 90 a 99 mm Hg', '3 3 1 2 1 1 1'],
      ['Presión elevada: sistólica de 160 o más, o diastólica de 100 o más mm Hg', '4 4 2 3 2 1 2'],
      ['Hipertensión con enfermedad vascular', '4 4 2 3 2 1 2'],
      ['Antecedente de presión alta en el embarazo (presión actual medible y normal)', '2 2 1 1 1 1 1'],
      ['Trombosis venosa profunda o embolia pulmonar: antecedente', '4 4 2 2 2 1 2'],
      ['Trombosis venosa profunda o embolia pulmonar: aguda', '4 4 3 3 3 1 3'],
      ['Trombosis venosa profunda o embolia pulmonar: con anticoagulación establecida', '4 4 2 2 2 1 2'],
      ['Trombosis: antecedentes familiares de primer grado', '2 2 1 1 1 1 1'],
      ['Cirugía mayor con inmovilización prolongada', '4 4 2 2 2 1 2'],
      ['Cirugía mayor sin inmovilización prolongada', '2 2 1 1 1 1 1'],
      ['Cirugía menor sin inmovilización', '1 1 1 1 1 1 1'],
      ['Mutaciones trombogénicas conocidas (factor V Leiden, protrombina, déficit de proteína S, C o antitrombina)', '4 4 2 2 2 1 2'],
      ['Várices', '1 1 1 1 1 1 1'],
      ['Trombosis venosa superficial', '2* 2* 1 1 1 1 1'],
      ['Cardiopatía isquémica actual o antecedente', '4 4 2|3 3 2|3 1 2|3'],
      ['Accidente cerebrovascular (antecedente)', '4 4 2|3 3 2|3 1 2'],
      ['Dislipidemias conocidas sin otros factores de riesgo cardiovascular', '2 2 2 2 2 1 2'],
      ['Valvulopatía no complicada', '2 2 1 1 1 1 1'],
      ['Valvulopatía complicada (hipertensión pulmonar, riesgo de fibrilación auricular, antecedente de endocarditis)', '4 4 1 1 1 2* 2*']
    ]},
    {g: 'Lupus eritematoso sistémico', filas: [
      ['Lupus con anticuerpos antifosfolípidos positivos o desconocidos', '4 4 3 3|3 3 1|1 3'],
      ['Lupus con trombocitopenia grave', '2 2 2 3|2 2 3*|2* 2*'],
      ['Lupus con tratamiento inmunosupresor', '2 2 2 2|2 2 2|1 2'],
      ['Lupus sin ninguna de las anteriores', '2 2 2 2|2 2 1|1 2']
    ]},
    {g: 'Trastornos neurológicos y depresión', filas: [
      ['Cefalea no migrañosa (leve o intensa)', '1|2 1|2 1|1 1|1 1|1 1 1|1'],
      ['Migraña sin aura, menos de 35 años', '2|3 2|3 1|2 2|2 2|2 1 2'],
      ['Migraña sin aura, 35 años o más', '3|4 3|4 1|2 2|2 2|2 1 2'],
      ['Migraña con aura, a cualquier edad', '4|4 4|4 2|3 2|3 2|3 1 2'],
      ['Epilepsia (si recibe tratamiento, ver Interacciones con medicamentos)', '1* 1* 1* 1* 1* 1 1'],
      ['Trastornos depresivos', '1 1 1 1 1 1 1']
    ]},
    {g: 'Infecciones y trastornos del aparato reproductor', filas: [
      ['Sangrado irregular sin sangrado abundante', '1 1 2 2 2 1 1|1'],
      ['Sangrado abundante o prolongado (patrón regular o irregular)', '1 1 2 2 2 2 1|2'],
      ['Sangrado vaginal sin explicación, sospechoso de afección grave, antes de la evaluación', '2 2 2 3 3 4|2 4|2'],
      ['Endometriosis', '1 1 1 1 1 2 1'],
      ['Tumores ováricos benignos (incluye quistes)', '1 1 1 1 1 1 1'],
      ['Dismenorrea grave', '1 1 1 1 1 2 1'],
      ['Enfermedad trofoblástica gestacional: β-hCG en descenso o indetectable', '1 1 1 1 1 3 3'],
      ['Enfermedad trofoblástica gestacional: β-hCG persistentemente elevada o enfermedad maligna', '1 1 1 1 1 4 4'],
      ['Ectropión cervical', '1 1 1 1 1 1 1'],
      ['Neoplasia intraepitelial cervical', '2 2 1 2 2 1 2'],
      ['Cáncer cervicouterino', '2 2 1 2 2 4|2 4|2'],
      ['Mama: masa sin diagnóstico', '2* 2* 2* 2* 2* 1 2'],
      ['Mama: enfermedad benigna', '1 1 1 1 1 1 1'],
      ['Mama: antecedentes familiares de cáncer', '1 1 1 1 1 1 1'],
      ['Cáncer de mama actual', '4 4 4 4 4 1 4'],
      ['Cáncer de mama pasado, sin evidencia de enfermedad durante 5 años', '3 3 3 3 3 1 3'],
      ['Cáncer de endometrio', '1 1 1 1 1 4|2 4|2'],
      ['Cáncer de ovario', '1 1 1 1 1 3|2 3|2'],
      ['Miomas uterinos sin distorsión de la cavidad', '1 1 1 1 1 1 1'],
      ['Miomas uterinos con distorsión de la cavidad', '1 1 1 1 1 4 4'],
      ['Anomalías anatómicas que distorsionan la cavidad uterina', '- - - - - 4 4'],
      ['Anomalías anatómicas que no distorsionan la cavidad uterina', '- - - - - 2 2'],
      ['Enfermedad pélvica inflamatoria pasada, con embarazo posterior', '1 1 1 1 1 1|1 1|1'],
      ['Enfermedad pélvica inflamatoria pasada, sin embarazo posterior', '1 1 1 1 1 2|2 2|2'],
      ['Enfermedad pélvica inflamatoria actual', '1 1 1 1 1 4|2* 4|2*'],
      ['Cervicitis purulenta, clamidia o gonorrea actual', '1 1 1 1 1 4|2* 4|2*'],
      ['Otras infecciones de transmisión sexual (excluye VIH y hepatitis)', '1 1 1 1 1 2|2 2|2'],
      ['Vaginitis (incluye tricomonas y vaginosis bacteriana)', '1 1 1 1 1 2|2 2|2'],
      ['Mayor riesgo de infecciones de transmisión sexual', '1 1 1 1 1 2/3*|2 2/3*|2']
    ]},
    {g: 'VIH y otras infecciones', filas: [
      ['Alto riesgo de VIH', '1 1 1 1 1 1*|1* 1*|1*'],
      ['VIH asintomático o enfermedad leve (estadio 1 o 2 de la OMS)', '1* 1* 1* 1* 1* 2|2 2|2'],
      ['VIH grave o avanzado (estadio 3 o 4 de la OMS)', '1* 1* 1* 1* 1* 3|2* 3|2*'],
      ['Esquistosomiasis (no complicada o con fibrosis hepática)', '1 1 1 1 1 1 1'],
      ['Tuberculosis no pélvica', '1* 1* 1* 1* 1* 1|1 1|1'],
      ['Tuberculosis pélvica', '1* 1* 1* 1* 1* 4|3 4|3'],
      ['Malaria', '1 1 1 1 1 1 1']
    ]},
    {g: 'Diabetes y tiroides', filas: [
      ['Antecedente de diabetes gestacional', '1 1 1 1 1 1 1'],
      ['Diabetes sin enfermedad vascular, no insulinodependiente', '2 2 2 2 2 1 2'],
      ['Diabetes sin enfermedad vascular, insulinodependiente', '2 2 2 2 2 1 2'],
      ['Diabetes con nefropatía, retinopatía o neuropatía', '3/4* 3/4* 2 3 2 1 2'],
      ['Diabetes con otra enfermedad vascular o de más de 20 años de duración', '3/4* 3/4* 2 3 2 1 2'],
      ['Trastornos tiroideos (bocio simple, hipertiroidismo, hipotiroidismo)', '1 1 1 1 1 1 1']
    ]},
    {g: 'Hígado, vesícula y anemias', filas: [
      ['Enfermedad de la vesícula sintomática, tratada con colecistectomía', '2 2 2 2 2 1 2'],
      ['Enfermedad de la vesícula sintomática, con tratamiento médico', '3 2 2 2 2 1 2'],
      ['Enfermedad de la vesícula sintomática actual', '3 2 2 2 2 1 2'],
      ['Enfermedad de la vesícula asintomática', '2 2 2 2 2 1 2'],
      ['Antecedente de colestasis relacionada con el embarazo', '2 2 1 1 1 1 1'],
      ['Antecedente de colestasis relacionada con anticonceptivos orales combinados', '3 2 2 2 2 1 2'],
      ['Hepatitis viral aguda o brote', '3/4*|2 3|2 1 1 1 1 1'],
      ['Hepatitis viral: portadora o crónica', '1 1 1 1 1 1 1'],
      ['Cirrosis leve (compensada)', '1 1 1 1 1 1 1'],
      ['Cirrosis grave (descompensada)', '4 3 3 3 3 1 3'],
      ['Tumor hepático benigno: hiperplasia nodular focal', '2 2 2 2 2 1 2'],
      ['Tumor hepático benigno: adenoma hepatocelular', '4 3 3 3 3 1 3'],
      ['Tumor hepático maligno (hepatoma)', '4 3/4 3 3 3 1 3'],
      ['Talasemia', '1 1 1 1 1 2 1'],
      ['Anemia drepanocítica', '2 2 1 1 1 2 1'],
      ['Anemia ferropénica', '1 1 1 1 1 2 1']
    ]},
    {g: 'Interacciones con medicamentos', filas: [
      ['Antirretrovirales: abacavir, zidovudina, lamivudina, didanosina o emtricitabina', '1 1 1 1 1 2/3*|2* 2/3*|2*'],
      ['Antirretrovirales: efavirenz', '2 2 2 D1N2 2 2/3|2 2/3|2'],
      ['Antirretrovirales: etravirina, nevirapina o rilpivirina', '1 1 1 1 1 2/3*|2* 2/3*|2*'],
      ['Antirretrovirales: inhibidores de la proteasa (atazanavir, lopinavir o darunavir con ritonavir; ritonavir)', '1 1 1 1 1 2/3*|2* 2/3*|2*'],
      ['Antirretrovirales: inhibidores de la integrasa (raltegravir, dolutegravir)', '1 1 1 1 1 2/3*|2* 2/3*|2*'],
      ['Profilaxis preexposición al VIH (tenofovir-emtricitabina, anillo de dapivirina, cabotegravir)', '1 1 1 1 1 1 1'],
      ['Anticonvulsivantes: fenitoína, carbamazepina, barbitúricos, primidona, topiramato, oxcarbazepina', '3* 2 3* D1N2* 2* 1 1'],
      ['Anticonvulsivantes: lamotrigina', '3* 3 1 1 1 1 1'],
      ['Antibióticos de amplio espectro, antifúngicos o antiparasitarios', '1 1 1 1 1 1 1'],
      ['Rifampicina o rifabutina', '3 2* 3* D1N2* 2* 1 1']
    ]}
  ]
};

/* Lee una celda para el momento elegido: 'I' inicio o 'C' continuación. */
window.mecCelda = function (celda, momento) {
  const aclarar = celda.includes('*');
  let c = celda.replace(/\*/g, '');
  if (c.includes('|')) c = c.split('|')[momento === 'C' ? 1 : 0];
  if (c === '-') return null;
  if (c === 'D1N2') return {rango: 2, texto: 'DMPA 1 · NET-EN 2', aclarar};
  return {rango: Math.max(...c.split('/').map(Number)), texto: c, aclarar};
};

/* Combina varias condiciones: por método queda la categoría más restrictiva y las condiciones que la causan. */
window.mecEvaluar = function (seleccion, momento) {
  const res = window.MEC.columnas.map(() => ({rango: 0, texto: '', aclarar: false, causas: []}));
  for (const id of seleccion) {
    const [g, f] = id.split('.').map(Number), fila = window.MEC.grupos[g].filas[f];
    fila[1].split(' ').forEach((celda, i) => {
      const v = window.mecCelda(celda, momento); if (!v) return;
      const r = res[i];
      if (v.rango > r.rango) { r.rango = v.rango; r.texto = v.texto; r.aclarar = v.aclarar; r.causas = [fila[0]]; }
      else if (v.rango === r.rango) { r.causas.push(fila[0]); r.aclarar = r.aclarar || v.aclarar; if (v.texto.length > r.texto.length) r.texto = v.texto; }
    });
  }
  return res;
};
