# Elijo

Consejería para elegir un método anticonceptivo después del parto. App web instalable para pacientes y obstetras, con un panel de administración para configurar la información que reciben las pacientes.

## Ponerla en marcha

Requiere Node 18 o superior.

```bash
npm install
npm run crear-admin -- admin
npm start
```

`crear-admin` muestra la clave una sola vez. La app queda en `http://localhost:3000` y el panel en `http://localhost:3000/admin`.

## Qué se configura desde el panel

- Versión y fecha de revisión del contenido.
- Métodos: visibles o no, gratis en el MSP, textos de cada ficha y eficacia.
- Tarjetas de "verdad o mito" y la lista de dudas y temores.
- Videos guía por método o generales (solo enlaces `https://`).
- Señales de alarma y referencias bibliográficas.
- Clave de la administradora.
- Código del establecimiento para el registro de consejerías, y los conteos por mes: pacientes que salen con método (línea de base y con la app) y motivos de quienes no quieren un método.

El método de lactancia y amenorrea viene desactivado. Se activa en Métodos.

## Qué no se configura desde el panel

Las reglas clínicas de elegibilidad (qué método se recomienda según semanas postparto, lactancia y condiciones de salud) están en `public/app.js`, en la función `estado`. Cambiarlas requiere revisión clínica y un cambio de código, no un clic.

## Rueda de elegibilidad

El modo obstetra incluye una rueda de elegibilidad con las 131 condiciones de la tabla resumen de la guía de la OMS (6.ª edición, 2025, sección 5.12). La tabla está transcrita en `public/rueda.js`. Las cinco filas de edad se derivaron de los umbrales que da la guía para cada método. Antes de cambiar una celda hay que cotejarla con la guía.

```bash
node herramientas/probar-rueda.js
```

## Dónde se guardan los datos

En la carpeta `data/` (o la que indique la variable `DATA_DIR`):

- `contenido.json`: el contenido publicado. Si no existe, se usa `contenido.inicial.json`.
- `historial/`: una copia de cada versión anterior.
- `admin.json`: usuario y clave cifrada.
- `secreto.txt`: firma de las sesiones.

- `registro.json`: conteos anónimos por mes. `ajustes.json`: código del establecimiento.

La app no guarda datos de las pacientes en el servidor: solo conteos. Sus respuestas quedan en su teléfono.

## Publicarla

Sirve cualquier servidor con Node y disco persistente para `data/`. Debe estar detrás de HTTPS: sin HTTPS la app no se puede instalar en el teléfono ni funciona sin conexión, y la clave viajaría sin cifrar. Variables: `PORT` y `DATA_DIR`.

### En Hostinger (planes Business o Cloud)

1. En hPanel, crea el subdominio (por ejemplo `elijo.fb-soluciones.com`) y añade una app Node.js sobre él, subiendo `elijo-hostinger.zip` o conectando el repositorio de GitHub. Comando de inicio: `npm start`.
2. Define estas variables de entorno en el panel de la app:
   - `DATA_DIR`: una carpeta fuera del despliegue, por ejemplo `/home/<usuario>/elijo-datos`. Hostinger sobrescribe la carpeta de la app en cada despliegue; sin esta variable se pierde lo publicado.
   - `ELIJO_SETUP_TOKEN`: un código de un solo uso (8 caracteres o más). Mientras no exista administradora, `/admin` muestra un formulario donde ella misma crea su usuario y su clave escribiendo ese código. Alternativa sin formulario: `ELIJO_ADMIN_USUARIO` y `ELIJO_ADMIN_CLAVE` (mínimo 10 caracteres) crean la administradora al arrancar.
3. Abre `/admin`, crea la administradora con el código y, una vez dentro, borra `ELIJO_SETUP_TOKEN` del panel de Hostinger.
4. Comprueba la persistencia: publica un cambio, vuelve a desplegar y verifica que el cambio sigue ahí.

## Pruebas

```bash
node herramientas/probar.js
```

Levanta el servidor con datos temporales y comprueba el inicio de sesión, la validación, el guardado y el cambio de clave.
