<?php
// Crea o reemplaza la administradora y muestra su clave una sola vez. Uso: php herramientas/crear-admin.php <usuario>
declare(strict_types=1);
require dirname(__DIR__) . '/lib.php';
$usuario = $argv[1] ?? 'admin';
if (!preg_match('/^[a-z0-9._-]{3,32}$/i', $usuario)) { fwrite(STDERR, "El usuario debe tener de 3 a 32 letras, números, puntos o guiones.\n"); exit(1); }
// ELIJO_CLAVE permite fijar la clave en pruebas automáticas; en uso normal se genera una al azar.
$clave = getenv('ELIJO_CLAVE') ?: rtrim(strtr(base64_encode(random_bytes(12)), '+/', '-_'), '=');
guardarAdmin($usuario, $clave);
echo "Administradora creada.\n  Usuario: $usuario\n";
if (!getenv('ELIJO_CLAVE')) echo "  Clave:   $clave\n";
echo "Guarda la clave ahora: no se vuelve a mostrar. Puedes cambiarla desde el panel.\n";
