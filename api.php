<?php
// API de Elijo. Las rutas /api/... llegan aquí por .htaccess (producción) o por router.php (desarrollo).
declare(strict_types=1);
require __DIR__ . '/lib.php';

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
$ruta = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$es = fn(string $m, string $r) => $metodo === $m && $ruta === $r;

try {
    if ($es('GET', '/api/contenido')) responder(leerContenido());

    // ----- Configuración inicial y sesión -----
    if ($es('GET', '/api/admin/estado')) responder(['hayAdmin' => (bool)leerAdmin(), 'configurar' => setupDisponible()]);

    if ($es('POST', '/api/admin/configurar')) {
        limitar('entrar', 5, 15, false);
        if (!setupDisponible()) responder(['error' => 'La configuración inicial no está disponible.'], 409);
        $b = cuerpo();
        if (!hash_equals(tokenSetup(), (string)($b['token'] ?? ''))) { fallo('entrar'); responder(['error' => 'El código de configuración no coincide.'], 401); }
        $u = (string)($b['usuario'] ?? ''); $c = (string)($b['clave'] ?? '');
        if (!preg_match('/^[a-z0-9._-]{3,32}$/i', $u)) responder(['error' => 'El usuario debe tener de 3 a 32 letras, números, puntos o guiones.'], 400);
        if (strlen($c) < 10 || strlen($c) > 100) responder(['error' => 'La clave debe tener al menos 10 caracteres.'], 400);
        guardarAdmin($u, $c);
        @unlink(dirDatos() . '/setup.json');
        ponerCookie(crearSesion($u), HORAS_SESION * 3600);
        responder(['usuario' => $u]);
    }

    if ($es('POST', '/api/admin/entrar')) {
        limitar('entrar', 5, 15, false);
        $b = cuerpo();
        if (!leerAdmin()) responder(['error' => 'Aún no hay administradora. Configúrala desde esta misma pantalla o con: php herramientas/crear-admin.php'], 503);
        $u = (string)($b['usuario'] ?? ''); $c = (string)($b['clave'] ?? '');
        if (!verificarClave($u, $c)) { fallo('entrar'); responder(['error' => 'Usuario o clave incorrectos.'], 401); }
        ponerCookie(crearSesion($u), HORAS_SESION * 3600);
        responder(['usuario' => $u]);
    }

    if ($es('POST', '/api/admin/salir')) { ponerCookie('', 0); responder([]); }

    if ($es('GET', '/api/admin/sesion')) {
        $s = leerSesion();
        $s ? responder(['usuario' => $s['u']]) : responder(['error' => 'Sin sesión.'], 401);
    }

    // ----- Contenido -----
    if ($es('PUT', '/api/admin/contenido')) {
        soloAdmin();
        $b = cuerpo();
        $errores = validar($b);
        if ($errores) responder(['error' => 'Hay datos por corregir.', 'errores' => $errores], 400);
        $nuevo = normalizar($b);
        $f = dirDatos() . '/contenido.json';
        if (is_file($f)) copy($f, dirDatos() . '/historial/contenido-' . time() . '.json');
        escribirJson($f, $nuevo);
        responder($nuevo);
    }

    if ($es('POST', '/api/admin/restaurar')) {
        soloAdmin();
        $f = dirDatos() . '/contenido.json';
        if (is_file($f)) rename($f, dirDatos() . '/historial/contenido-' . time() . '.json');
        responder(semilla());
    }

    if ($es('POST', '/api/admin/clave')) {
        $s = soloAdmin();
        limitar('clave', 5, 15, false);
        $b = cuerpo();
        if (!verificarClave($s['u'], (string)($b['actual'] ?? ''))) { fallo('clave'); responder(['error' => 'La clave actual no coincide.'], 401); }
        $n = (string)($b['nueva'] ?? '');
        if (strlen($n) < 10 || strlen($n) > 100) responder(['error' => 'La clave nueva debe tener al menos 10 caracteres.'], 400);
        guardarAdmin($s['u'], $n);
        responder([]);
    }

    // ----- Registro anónimo -----
    if ($es('POST', '/api/registro/motivo')) {
        limitar('motivo', 30, 60);
        $m = (string)(cuerpo()['motivo'] ?? '');
        if (!in_array($m, motivosValidos(), true)) responder(['error' => 'Motivo no válido.'], 400);
        sumar('motivosPacientes', $m);
        responder([]);
    }

    if ($es('POST', '/api/registro/consejeria')) {
        limitar('consejeria', 120, 60);
        $b = cuerpo();
        $centro = centroPorCodigo((string)($b['codigo'] ?? ''));
        if (!$centro) responder(['error' => 'El código del establecimiento no es correcto.'], 403);
        $fase = (string)($b['fase'] ?? '');
        if (!in_array($fase, ['base', 'app'], true)) responder(['error' => 'Indica si es línea de base o uso con la app.'], 400);
        $metodo = (string)($b['metodo'] ?? '');
        if ($metodo === 'ninguno') {
            $motivo = (string)($b['motivo'] ?? '');
            if (!in_array($motivo, motivosValidos(), true)) responder(['error' => 'Elige el motivo.'], 400);
            sumar($centro['id'], $fase, 'sinMetodo', $motivo);
        } elseif (in_array($metodo, array_column(semilla()['metodos'], 'id'), true)) {
            sumar($centro['id'], $fase, 'conMetodo', $metodo);
        } else responder(['error' => 'Método no válido.'], 400);
        responder(['centro' => $centro['nombre']]);
    }

    // El teléfono comprueba el código al guardarlo y muestra el nombre del centro.
    if ($es('POST', '/api/registro/centro')) {
        limitar('centro', 30, 60);
        $centro = centroPorCodigo((string)(cuerpo()['codigo'] ?? ''));
        if (!$centro) responder(['error' => 'El código del establecimiento no es correcto.'], 403);
        responder(['centro' => $centro['nombre']]);
    }

    if ($es('GET', '/api/admin/registro')) {
        soloAdmin();
        responder(['registro' => (object)leerJson(dirDatos() . '/registro.json', []), 'centros' => centros()]);
    }

    if ($es('PUT', '/api/admin/centros')) {
        soloAdmin();
        $lista = cuerpo()['centros'] ?? null;
        if (!is_array($lista) || count($lista) > 30) responder(['error' => 'Revisa la lista de centros.'], 400);
        $nuevos = []; $codigos = [];
        foreach (array_values($lista) as $i => $c) {
            $nombre = trim((string)($c['nombre'] ?? '')); $codigo = trim((string)($c['codigo'] ?? '')); $id = (string)($c['id'] ?? '');
            if (mb_strlen($nombre) < 2 || mb_strlen($nombre) > 60) responder(['error' => 'Centro ' . ($i + 1) . ': el nombre debe tener de 2 a 60 caracteres.'], 400);
            if (strlen($codigo) < 4 || strlen($codigo) > 20 || preg_match('/\s/', $codigo)) responder(['error' => "Centro \"$nombre\": el código debe tener de 4 a 20 caracteres, sin espacios."], 400);
            if (in_array($codigo, $codigos, true)) responder(['error' => "El código \"$codigo\" está repetido; cada centro necesita uno distinto."], 400);
            $codigos[] = $codigo;
            if (!preg_match('/^c[0-9a-f]{1,8}$/', $id)) $id = 'c' . bin2hex(random_bytes(3));
            $nuevos[] = ['id' => $id, 'nombre' => $nombre, 'codigo' => $codigo];
        }
        $a = leerJson(dirDatos() . '/ajustes.json', []); unset($a['codigo']); $a['centros'] = $nuevos;
        escribirJson(dirDatos() . '/ajustes.json', $a);
        responder(['centros' => $nuevos]);
    }

    responder(['error' => 'Ruta no encontrada.'], 404);
} catch (Throwable $t) {
    error_log('Elijo: ' . $t->getMessage());
    responder(['error' => 'Error del servidor.'], 500);
}
