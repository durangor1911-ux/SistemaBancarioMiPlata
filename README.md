# SistemaBancarioMiPlata

## Ejecutar la aplicación

Desde esta carpeta, inicia el servidor con `npm start` y abre <http://localhost:3000>.
No abras la página con doble clic: la interfaz utiliza la API del servidor.

La página de inicio, los formularios de acceso y el panel bancario comparten la hoja de estilos responsive `styles.css`. Al iniciar o registrar sesión, el navegador conserva únicamente el token de sesión en `localStorage`; los perfiles, contraseñas protegidas y operaciones siguen persistiendo en los archivos locales del servidor. Al registrarse correctamente, se inicia sesión y se abre el panel automáticamente.

## Funciones

- El cliente registrado inicia sesión, abre cuentas de ahorros o corriente y una tarjeta de crédito, consulta saldos e historial, consigna, retira y transfiere.
- Las cuentas de ahorros descuentan el interés implementado por su clase al retirar. La cuenta corriente aplica su regla de sobregiro.
- Las compras con tarjeta permiten elegir cuotas; el panel también permite pagar la deuda desde una cuenta propia.
- Los números de cuenta se comparten con el destinatario para poder recibir transferencias.
- Los productos y sus movimientos se guardan en `data/cuentas.json`; los perfiles se guardan en `data/clientes.json`. Las contraseñas permanecen como hashes.
- Es un simulador académico local; las consignaciones no representan dinero real.

## Configurar el administrador

El formulario público siempre registra perfiles `CLIENTE`; nunca permite elegir `ADMIN`. Para crear el administrador inicial, define en PowerShell estas variables **en la misma terminal** antes de iniciar el servidor:

```powershell
$env:ADMIN_CEDULA = "REEMPLAZA_CON_CEDULA"
$env:ADMIN_NOMBRE = "Nombre del administrador"
$env:ADMIN_CELULAR = "3001234567"
$env:ADMIN_USUARIO = "admin01"
$securePassword = Read-Host "Contraseña del administrador" -AsSecureString
$env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new("", $securePassword).Password
npm start
```

La cédula debe tener de 6 a 10 dígitos, el usuario de 4 a 20 letras/números, y la contraseña debe incluir mayúscula, minúscula y número, con al menos 8 caracteres.

Al arrancar, el servidor crea ese perfil una sola vez y almacena únicamente el hash. Inicia sesión con el usuario/contraseña configurados para ver el panel inferior de usuarios. Solo el administrador autenticado puede consultar o eliminar perfiles; al borrar un cliente también se borran sus cuentas. Las cuentas ADMIN están protegidas contra eliminación.

Si el servidor ya estaba abierto, deténlo y vuelve a iniciarlo después de definir las variables. No compartas ni publiques la contraseña del administrador.