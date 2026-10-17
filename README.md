# SistemaBancarioMiPlata

## Ejecutar la aplicación

Desde esta carpeta, inicia el servidor estático con `npm start` y abre <http://localhost:3000>.
No hay API bancaria: el servidor solo entrega los archivos de la página y escucha en `127.0.0.1`. Las operaciones se ejecutan en el navegador y la información se guarda en `localStorage` de ese navegador. No abras la página con doble clic; utiliza la dirección local indicada para que el navegador habilite las funciones criptográficas.

Para validar el sistema ejecuta `npm test`. No requiere base de datos ni servicios externos. Las cuentas e historiales nuevos quedan en el almacenamiento local del navegador y no se sincronizan con otros navegadores o dispositivos. Las fuentes del sistema también usan tipografías de respaldo para funcionar sin conexión.

La página de inicio, los formularios de acceso y el panel bancario comparten la hoja de estilos responsive `styles.css`. Los perfiles, hashes de contraseña, productos y movimientos se almacenan en `localStorage`. Las contraseñas se protegen con PBKDF2 mediante Web Crypto; no guardamos la contraseña original. Al registrarse correctamente, se inicia sesión y se abre el panel automáticamente. El modo local es para demostración académica: una persona con acceso al navegador puede inspeccionar o modificar el almacenamiento y los roles no son controles de seguridad del lado servidor.

## Funciones

- El cliente registrado inicia sesión, abre cuentas de ahorros o corriente y una tarjeta de crédito, consulta saldos e historial, consigna, retira y transfiere.
- Las cuentas de ahorros descuentan el interés implementado por su clase al retirar. La cuenta corriente aplica su regla de sobregiro.
- Las compras con tarjeta permiten elegir cuotas; el panel también permite pagar la deuda desde una cuenta propia.
- Los números de cuenta se comparten con el destinatario para poder recibir transferencias.
- Los movimientos de cada producto quedan guardados junto con su cuenta en el almacenamiento local del navegador y sobreviven al cierre o recarga de la página en el mismo navegador.
- Los JSON anteriores en `data/` no se importan automáticamente; el modo local inicia su propio almacenamiento independiente.
- Es un simulador académico local; las consignaciones no representan dinero real.

## Administración y modo local

La administración de usuarios y la creación de administradores requieren un backend y están desactivadas en el modo sin API. El registro local solo crea perfiles `CLIENTE`.

El navegador almacena los datos asociados a este origen local. Si se borran los datos del navegador, se pierde el historial; exporta o respalda los datos antes de limpiar el almacenamiento. El sistema es un simulador académico y no debe utilizarse con dinero ni credenciales reales.