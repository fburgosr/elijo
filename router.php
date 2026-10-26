<?php
// Enrutador para el servidor de desarrollo de PHP (php -S). En producción lo hace .htaccess.
$ruta = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (str_starts_with($ruta, '/api/')) { require __DIR__ . '/api.php'; return true; }
if ($ruta === '/admin' || $ruta === '/admin/') { readfile(__DIR__ . '/admin.html'); return true; }
if (preg_match('#^/(herramientas|data)(/|$)#', $ruta) || preg_match('#^/(lib|router)\.php$#', $ruta)) { http_response_code(404); return true; }
return false; // archivo estático
