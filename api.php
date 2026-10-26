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
        $esperado = (string)(leerJson(dirDatos() . '/ajustes.json', [])['codigo'] ?? '');
        if ($esperado === '' || !hash_equals($esperado, (string)($b['codigo'] ?? ''))) responder(['error' => 'El código del establecimiento no es correcto.'], 403);
        $fase = (string)($b['fase'] ?? '');
        if (!in_array($fase, ['base', 'app'], true)) responder(['error' => 'Indica si es línea de base o uso con la app.'], 400);
        $metodo = (string)($b['metodo'] ?? '');
        if ($metodo === 'ninguno') {
            $motivo = (string)($b['motivo'] ?? '');
            if (!in_array($motivo, motivosValidos(), true)) responder(['error' => 'Elige el motivo.'], 400);
            sumar($fase, 'sinMetodo', $motivo);
        } elseif (in_array($metodo, array_column(semilla()['metodos'], 'id'), true)) {
            sumar($fase, 'conMetodo', $metodo);
        } else responder(['error' => 'Método no válido.'], 400);
        responder([]);
    }

    if ($es('GET', '/api/admin/registro')) {
        soloAdmin();
        responder(['registro' => (object)leerJson(dirDatos() . '/registro.json', []), 'codigoDefinido' => !empty(leerJson(dirDatos() . '/ajustes.json', [])['codigo'])]);
    }

    if ($es('PUT', '/api/admin/codigo')) {
        soloAdmin();
        $c = (string)(cuerpo()['codigo'] ?? '');
        if (strlen($c) < 4 || strlen($c) > 20) responder(['error' => 'El código debe tener de 4 a 20 caracteres.'], 400);
        $a = leerJson(dirDatos() . '/ajustes.json', []); $a['codigo'] = $c;
        escribirJson(dirDatos() . '/ajustes.json', $a);
        responder([]);
    }

    responder(['error' => 'Ruta no encontrada.'], 404);
} catch (Throwable $t) {
    error_log('Elijo: ' . $t->getMessage());
    responder(['error' => 'Error del servidor.'], 500);
}
