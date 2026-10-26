<?php
// Funciones comunes del servidor de Elijo en PHP: datos, sesiones, límites y respuestas.
declare(strict_types=1);

const COOKIE = 'elijo_sesion';
const HORAS_SESION = 8;

function raiz(): string { return __DIR__; }

// Carpeta de datos fuera del directorio público. En Hostinger: ~/domains/<dominio>/elijo-datos.
function dirDatos(): string {
    static $dir = null;
    if ($dir !== null) return $dir;
    $env = getenv('DATA_DIR');
    // Si el sitio cuelga de un public_html (hosting compartido), los datos van junto a public_html, nunca dentro.
    $fuera = null;
    for ($d = __DIR__; dirname($d) !== $d; $d = dirname($d)) {
        if (basename($d) === 'public_html') { $fuera = dirname($d) . '/elijo-datos'; break; }
    }
    $candidatos = $env ? [$env] : array_values(array_filter([$fuera, dirname(__DIR__) . '/elijo-datos', __DIR__ . '/data']));
    foreach ($candidatos as $c) {
        if (!is_dir($c)) @mkdir($c, 0700, true);
        if (is_dir($c) && is_writable($c)) {
            if (!is_dir("$c/historial")) @mkdir("$c/historial", 0700, true);
            // Si por fuerza quedó dentro del sitio, se bloquea el acceso web.
            if (!file_exists("$c/.htaccess")) {
                file_put_contents("$c/.htaccess", "Require all denied\nDeny from all\n");
            }
            return $dir = $c;
        }
    }
    throw new RuntimeException('No hay una carpeta de datos escribible.');
}

function leerJson(string $archivo, $porDefecto) {
    if (!is_file($archivo)) return $porDefecto;
    $t = file_get_contents($archivo);
    $v = json_decode($t, true);
    return $v === null ? $porDefecto : $v;
}

function escribirJson(string $archivo, $valor): void {
    $tmp = $archivo . '.tmp';
    file_put_contents($tmp, json_encode($valor, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), LOCK_EX);
    rename($tmp, $archivo);
}

function semilla(): array { return leerJson(raiz() . '/contenido.inicial.json', []); }

function leerContenido(): array {
    $guardado = leerJson(dirDatos() . '/contenido.json', null);
    // Lo publicado antes de una actualización puede no tener las secciones nuevas: se completan con la semilla.
    return $guardado ? array_merge(semilla(), $guardado) : semilla();
}

// ----- Administradora -----
function leerAdmin(): ?array { return leerJson(dirDatos() . '/admin.json', null); }

function guardarAdmin(string $usuario, string $clave): void {
    escribirJson(dirDatos() . '/admin.json', ['usuario' => $usuario, 'hash' => password_hash($clave, PASSWORD_DEFAULT)]);
    @chmod(dirDatos() . '/admin.json', 0600);
}

function verificarClave(string $usuario, string $clave): bool {
    $a = leerAdmin();
    if (!$a) return false;
    $ok = password_verify($clave, $a['hash']);
    return $ok && hash_equals($a['usuario'], $usuario);
}

function secreto(): string {
    $f = dirDatos() . '/secreto.txt';
    if (!is_file($f)) { file_put_contents($f, bin2hex(random_bytes(32))); @chmod($f, 0600); }
    return trim(file_get_contents($f));
}

function b64url(string $s): string { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }
function b64urlDec(string $s): string { return base64_decode(strtr($s, '-_', '+/')) ?: ''; }

function crearSesion(string $usuario): string {
    $cuerpo = b64url(json_encode(['u' => $usuario, 'exp' => time() + HORAS_SESION * 3600]));
    return $cuerpo . '.' . b64url(hash_hmac('sha256', $cuerpo, secreto(), true));
}

function leerSesion(): ?array {
    $t = $_COOKIE[COOKIE] ?? '';
    if (!is_string($t) || !str_contains($t, '.')) return null;
    [$cuerpo, $firma] = explode('.', $t, 2);
    $esperada = b64url(hash_hmac('sha256', $cuerpo, secreto(), true));
    if (!hash_equals($esperada, $firma)) return null;
    $s = json_decode(b64urlDec($cuerpo), true);
    $a = leerAdmin();
    return ($s && $a && ($s['exp'] ?? 0) > time() && hash_equals($a['usuario'], (string)($s['u'] ?? ''))) ? $s : null;
}

function ponerCookie(string $valor, int $segundos): void {
    $segura = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    setcookie(COOKIE, $valor, ['expires' => $segundos ? time() + $segundos : 1, 'path' => '/', 'httponly' => true, 'samesite' => 'Strict', 'secure' => $segura]);
}

// ----- Límite de intentos por IP, guardado en archivo -----
function limitar(string $clave, int $max, int $minutos, bool $contar = true): void {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0';
    $f = dirDatos() . '/limites.json';
    $fh = fopen($f, 'c+'); flock($fh, LOCK_EX);
    $todo = json_decode(stream_get_contents($fh) ?: '[]', true) ?: [];
    $k = $clave . '|' . $ip; $ahora = time();
    $r = $todo[$k] ?? ['n' => 0, 'desde' => $ahora];
    if ($ahora - $r['desde'] > $minutos * 60) $r = ['n' => 0, 'desde' => $ahora];
    if ($r['n'] >= $max) { flock($fh, LOCK_UN); fclose($fh); responder(['error' => 'Demasiados intentos. Espera unos minutos.'], 429); }
    if ($contar) $r['n']++;
    $todo[$k] = $r;
    foreach ($todo as $kk => $rr) if ($ahora - $rr['desde'] > 24 * 3600) unset($todo[$kk]);
    ftruncate($fh, 0); rewind($fh); fwrite($fh, json_encode($todo)); flock($fh, LOCK_UN); fclose($fh);
}

function fallo(string $clave, int $minutos = 15): void {
    // Registra un intento fallido (el éxito no se descuenta: el límite se reinicia solo con el tiempo).
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0';
    $f = dirDatos() . '/limites.json';
    $todo = leerJson($f, []);
    $k = $clave . '|' . $ip; $ahora = time();
    $r = $todo[$k] ?? ['n' => 0, 'desde' => $ahora];
    if ($ahora - $r['desde'] > $minutos * 60) $r = ['n' => 0, 'desde' => $ahora];
    $r['n']++; $todo[$k] = $r;
    escribirJson($f, $todo);
}

// ----- Respuestas -----
function responder($datos, int $estado = 200): never {
    http_response_code($estado);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function cuerpo(): array {
    $t = file_get_contents('php://input');
    if (strlen($t) > 300 * 1024) responder(['error' => 'Contenido demasiado grande.'], 413);
    $v = json_decode($t ?: '{}', true);
    return is_array($v) ? $v : [];
}

function soloAdmin(): array {
    // La cabecera propia impide que otra página envíe la petición en nombre de la administradora.
    if (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'elijo') responder(['error' => 'Petición no válida.'], 400);
    $s = leerSesion();
    if (!$s) responder(['error' => 'Inicia sesión para continuar.'], 401);
    return $s;
}

// ----- Validación del contenido -----
function texto($v, int $max): bool { return is_string($v) && trim($v) !== '' && mb_strlen($v) <= $max; }
function enlace($v): bool { return is_string($v) && preg_match('#^https://\S+$#', $v) === 1 && strlen($v) <= 500; }

function validar($c): array {
    $e = [];
    if (!is_array($c)) return ['El contenido no es válido.'];
    if (!texto($c['version'] ?? null, 30)) $e[] = 'Falta la versión.';
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($c['fecha'] ?? ''))) $e[] = 'La fecha de revisión debe tener el formato AAAA-MM-DD.';
    $sem = semilla(); $ids = array_column($sem['metodos'], 'id');
    $m = $c['metodos'] ?? null;
    if (!is_array($m) || count($m) !== count($ids) || array_column($m, 'id') !== $ids) {
        $e[] = 'La lista de métodos no puede cambiar de tamaño ni de orden.';
    } else {
        foreach ($m as $x) {
            foreach (['nombre', 'apodo', 'dura'] as $k) if (!texto($x[$k] ?? null, 120)) $e[] = "Método {$x['id']}: revisa \"$k\".";
            foreach (['uso', 'lact', 'efectos'] as $k) if (!texto($x[$k] ?? null, 400)) $e[] = "Método {$x['id']}: revisa \"$k\".";
            if (!is_numeric($x['efic'] ?? null) || $x['efic'] < 0 || $x['efic'] > 100) $e[] = "Método {$x['id']}: la eficacia debe ser un número de 0 a 100.";
        }
    }
    $lista = function (string $nombre, $arr, int $max, callable $f) use (&$e) {
        if (!is_array($arr) || count($arr) > $max) { $e[] = "Revisa la lista de $nombre."; return; }
        foreach (array_values($arr) as $i => $x) if (!$f($x)) $e[] = "$nombre: revisa el elemento " . ($i + 1) . '.';
    };
    $lista('mitos', $c['mitos'] ?? null, 40, fn($m) => is_array($m) && texto($m['q'] ?? null, 200) && texto($m['r'] ?? null, 500) && texto($m['f'] ?? null, 120) && is_bool($m['v'] ?? null));
    $lista('dudas y temores', $c['temores'] ?? null, 40, fn($t) => is_array($t) && texto($t['q'] ?? null, 200) && texto($t['r'] ?? null, 500) && texto($t['f'] ?? null, 120));
    $lista('videos', $c['videos'] ?? null, 60, fn($v) => is_array($v) && texto($v['t'] ?? null, 80) && enlace($v['url'] ?? null) && (($v['m'] ?? '') === '' || in_array($v['m'], $ids, true)));
    $lista('señales de alarma', $c['alarmas'] ?? null, 20, fn($a) => texto($a, 160));
    $lista('datos para pacientes', $c['datos'] ?? null, 30, fn($d) => is_array($d) && texto($d['t'] ?? null, 240) && texto($d['f'] ?? null, 120));
    $lista('historias', $c['historias'] ?? null, 30, fn($h) => is_array($h) && texto($h['nombre'] ?? null, 60) && texto($h['texto'] ?? null, 600));
    $lista('consejos para la pareja', $c['pareja'] ?? null, 15, fn($x) => texto($x, 240));
    $lista('referencias', $c['refs'] ?? null, 60, fn($r) => is_array($r) && texto($r[0] ?? null, 400) && enlace($r[1] ?? null));
    return $e;
}

// Solo se guardan los campos conocidos; las reglas clínicas (hormonal, combinado, tags) vienen siempre de la semilla.
function normalizar(array $c): array {
    $sem = semilla();
    $metodos = [];
    foreach ($sem['metodos'] as $i => $base) {
        $m = $c['metodos'][$i];
        $metodos[] = array_merge($base, ['activo' => !empty($m['activo']), 'msp' => !empty($m['msp']), 'efic' => (float)$m['efic'],
            'nombre' => $m['nombre'], 'apodo' => $m['apodo'], 'dura' => $m['dura'], 'uso' => $m['uso'], 'lact' => $m['lact'], 'efectos' => $m['efectos']]);
    }
    return [
        'version' => trim($c['version']), 'fecha' => $c['fecha'], 'metodos' => $metodos,
        'mitos' => array_map(fn($m) => ['q' => $m['q'], 'v' => $m['v'], 'r' => $m['r'], 'f' => $m['f'], 'activo' => ($m['activo'] ?? true) !== false], $c['mitos']),
        'temores' => array_map(fn($t) => ['q' => $t['q'], 'r' => $t['r'], 'f' => $t['f'], 'activo' => ($t['activo'] ?? true) !== false], $c['temores']),
        'videos' => array_map(fn($v) => ['t' => $v['t'], 'url' => $v['url'], 'm' => $v['m'] ?? ''], $c['videos']),
        'alarmas' => array_map('trim', $c['alarmas']),
        'datos' => array_map(fn($d) => ['t' => $d['t'], 'f' => $d['f']], $c['datos']),
        'historias' => array_map(fn($h) => ['nombre' => $h['nombre'], 'texto' => $h['texto']], $c['historias']),
        'pareja' => array_map('trim', $c['pareja']),
        'refs' => array_map(fn($r) => [$r[0], $r[1]], $c['refs']),
    ];
}

// ----- Registro anónimo: conteos por mes -----
const OTROS_MOTIVOS = ['Otra razón', 'Prefiero no decir'];
function motivosValidos(): array { return array_merge(array_column(leerContenido()['temores'], 'q'), OTROS_MOTIVOS); }

function sumar(string ...$ruta): void {
    $f = dirDatos() . '/registro.json';
    $fh = fopen($f, 'c+'); flock($fh, LOCK_EX);
    $r = json_decode(stream_get_contents($fh) ?: '{}', true) ?: [];
    $mes = gmdate('Y-m');
    $o = &$r[$mes]; if (!is_array($o)) $o = [];
    $ultimo = array_pop($ruta);
    foreach ($ruta as $k) { if (!isset($o[$k]) || !is_array($o[$k])) $o[$k] = []; $o = &$o[$k]; }
    $o[$ultimo] = ($o[$ultimo] ?? 0) + 1;
    unset($o);
    ftruncate($fh, 0); rewind($fh); fwrite($fh, json_encode($r, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)); flock($fh, LOCK_UN); fclose($fh);
}

function tokenSetup(): string {
    $env = trim((string)getenv('ELIJO_SETUP_TOKEN'));
    if ($env !== '') return $env;
    $f = dirDatos() . '/setup.json';
    return trim((string)(leerJson($f, [])['token'] ?? ''));
}
function setupDisponible(): bool { return !leerAdmin() && strlen(tokenSetup()) >= 8; }
