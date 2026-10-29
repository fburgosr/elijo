# Elijo

Consejería para elegir un método anticonceptivo después del parto. App web instalable para pacientes y obstetras, con un panel de administración para configurar la información que reciben las pacientes.

## Ponerla en marcha

Requiere PHP 8.1 o superior. En desarrollo:

```bash
php herramientas/crear-admin.php admin
php -S localhost:3000 router.php
```

`crear-admin.php` muestra la clave una sola vez. La app queda en `http://localhost:3000` y el panel en `http://localhost:3000/admin`. En un servidor con Apache o LiteSpeed no hace falta `router.php`: el archivo `.htaccess` enruta la API y el panel.

## Qué se configura desde el panel

- Versión y fecha de revisión del contenido.
- Métodos: visibles o no, gratis en el MSP, textos de cada ficha y eficacia.
- Tarjetas de "verdad o mito" y la lista de dudas y temores.
- Videos guía por método o generales (solo enlaces `https://`).
- Señales de alarma y referencias bibliográficas.
- Clave de la administradora.
- Centros de salud, cada uno con su código para el registro de consejerías, y los conteos por mes y por centro: pacientes que salen con método (línea de base y con la app) y motivos de quienes no quieren un método.

El método de lactancia y amenorrea viene desactivado. Se activa en Métodos.

En Ayuda la usuaria elige el tema: como el teléfono, claro u oscuro (`tema.js`, guardado en el propio teléfono).

## Qué no se configura desde el panel

Las reglas clínicas de elegibilidad (qué método se recomienda según semanas postparto, lactancia y condiciones de salud) están en `app.js`, en la función `estado`. Cambiarlas requiere revisión clínica y un cambio de código, no un clic.

## Guion de consulta y rueda de elegibilidad

El modo obstetra abre con la pestaña Rueda: un anillo de siete sectores (uno por método) que se colorea con la categoría de la OMS a medida que la obstetra responde el guion pregunta a pregunta, con botones grandes No/Sí y barra de progreso. Tocar un sector muestra la categoría y la causa. Las animaciones se desactivan si el teléfono tiene activada la opción de reducir movimiento. Si la edad ya se respondió, las preguntas de tabaco y migraña no la vuelven a pedir. Las respuestas son las mismas del guion en lista, así que se puede cambiar de una vista a otra sin perder nada.

La pestaña Guion muestra el mismo guion de consulta como lista (`guion.js`): unas 25 preguntas de cribado agrupadas por tema (posparto y lactancia, datos generales, presión y corazón, cefalea y lupus, sangrado y mama, diabetes e hígado, VIH y medicamentos). Solo cuando la respuesta es "Sí" se abren las opciones de detalle, y cada opción apunta a filas de la tabla de la OMS. El resultado por método se actualiza con cada respuesta. La tabla completa sigue disponible desde el guion.

La rueda de elegibilidad contiene las 131 condiciones de la tabla resumen de la guía de la OMS (6.ª edición, 2025, sección 5.12). La tabla está transcrita en `rueda.js`. Las cinco filas de edad se derivaron de los umbrales que da la guía para cada método. Antes de cambiar una celda hay que cotejarla con la guía.

```bash
node herramientas/probar-rueda.js
```

## Dónde se guardan los datos

Fuera del directorio público, en la carpeta hermana `elijo-datos` (o en la que indique la variable `DATA_DIR`). Si no se puede crear, se usa `data/` dentro del sitio, bloqueada por `.htaccess`.

- `contenido.json`: el contenido publicado. Si no existe, se usa `contenido.inicial.json`.
- `historial/`: una copia de cada versión anterior.
- `admin.json`: usuario y clave cifrada de la administradora.
- `secreto.txt`: firma de las sesiones.
- `registro.json`: conteos anónimos por mes. `ajustes.json`: centros de salud y sus códigos. `limites.json`: intentos por IP.

La app no guarda datos de las pacientes en el servidor: solo conteos. Sus respuestas quedan en su teléfono.

## Publicarla

Sirve cualquier hosting con PHP 8.1 o superior y HTTPS; no necesita base de datos ni Node en el servidor. Sin HTTPS la app no se puede instalar en el teléfono ni funciona sin conexión.

### En Hostinger (cualquier plan con PHP)

1. En hPanel, crea el subdominio (por ejemplo `elijo.fb-soluciones.es`) y, en Avanzado → Git, conecta este repositorio en la rama `main` con `public_html` como carpeta de destino. Con el webhook de "Auto Deployment" registrado en GitHub, cada cambio subido a `main` se publica solo en unos segundos; `version.json` muestra la fecha de la última publicación.
2. Para crear la administradora sin terminal, crea el archivo `elijo-datos/setup.json` (carpeta hermana de `public_html`) con el contenido `{"token": "un-codigo-de-8-o-mas-caracteres"}`. Mientras no exista administradora, `/admin` muestra un formulario donde ella misma crea su usuario y su clave escribiendo ese código; el archivo se borra solo al terminar.
3. Comprueba la persistencia: publica un cambio desde el panel, vuelve a desplegar y verifica que el cambio sigue ahí.

## Pruebas

```bash
node herramientas/probar.js
```

Levanta el servidor PHP de desarrollo con datos temporales y comprueba la configuración inicial, el inicio de sesión, la validación, el guardado, el registro y el cambio de clave.
