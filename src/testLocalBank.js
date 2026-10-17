import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

const almacenamiento = new Map();
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: clave => almacenamiento.get(clave) ?? null,
  setItem: (clave, valor) => almacenamiento.set(clave, String(valor)),
  removeItem: clave => almacenamiento.delete(clave),
} });

const banco = await import('./localBank.js');
const datosCliente = (cedula, usuario) => ({
  cedula,
  nombreCompleto: `Usuario ${usuario}`,
  celular: '3001234567',
  usuario,
  password: 'PruebaSegura123',
  confirmarPassword: 'PruebaSegura123',
});

await banco.registrar(datosCliente('12345678', 'cliente01'));
await banco.registrar(datosCliente('23456789', 'cliente02'));
const sesion1 = await banco.iniciarSesion('cliente01', 'PruebaSegura123');
const sesion2 = await banco.iniciarSesion('cliente02', 'PruebaSegura123');
assert.equal(sesion1.cedula, '12345678');
await assert.rejects(banco.iniciarSesion('cliente01', 'incorrecta'));

const ahorros1 = banco.abrirProducto(sesion1.cedula, 'AHORROS');
const corriente1 = banco.abrirProducto(sesion1.cedula, 'CORRIENTE');
const tarjeta1 = banco.abrirProducto(sesion1.cedula, 'TARJETA_CREDITO');
const ahorros2 = banco.abrirProducto(sesion2.cedula, 'AHORROS');
banco.operarCuenta(sesion1.cedula, 'consignar', ahorros1.numeroCuenta, 200000);
banco.operarCuenta(sesion1.cedula, 'retirar', ahorros1.numeroCuenta, 10000);
banco.operarCuenta(sesion1.cedula, 'consignar', corriente1.numeroCuenta, 100000);
const transferencia = banco.hacerTransferencia(sesion1.cedula, ahorros1.numeroCuenta, ahorros2.numeroCuenta, 20000);
assert.equal(transferencia.monto, 20000);
assert.throws(() => banco.hacerTransferencia(sesion2.cedula, ahorros1.numeroCuenta, ahorros2.numeroCuenta, 1000), /no existe o no te pertenece/);

const compra = banco.comprarConTarjeta(sesion1.cedula, tarjeta1.numeroCuenta, 100000, 3);
assert.equal(compra.deuda, 100000);
const pago = banco.pagarTarjeta(sesion1.cedula, tarjeta1.numeroCuenta, corriente1.numeroCuenta, 50000);
assert.equal(pago.deuda, 50000);

const historial = banco.listarMovimientos(sesion1.cedula, ahorros1.numeroCuenta);
assert.equal(historial.length, 3);
assert.ok(new Date(historial[0].fecha) >= new Date(historial.at(-1).fecha));
assert.equal(banco.listarProductos(sesion1.cedula).length, 3);
assert.equal(banco.listarProductos(sesion2.cedula)[0].numeroCuenta, ahorros2.numeroCuenta);

// Una nueva lectura del almacenamiento recupera también productos e historial.
const datosPersistidos = JSON.parse(globalThis.localStorage.getItem('miPlataDatosLocales'));
assert.equal(datosPersistidos.cuentas.length, 4);
assert.equal(datosPersistidos.cuentas.find(registro => registro.cuenta.numeroCuenta === ahorros1.numeroCuenta).cuenta.movimientos.length, 3);

assert.throws(() => banco.actualizarUsuario(sesion1.cedula, 'cliente02'), /ya está registrado/);
assert.throws(() => banco.actualizarUsuario(sesion1.cedula, 'ab'), /entre 4 y 20/);
const sesionActualizada = banco.actualizarUsuario(sesion1.cedula, 'nuevoUsuario01');
assert.equal(sesionActualizada.usuario, 'nuevoUsuario01');
await assert.rejects(banco.iniciarSesion('cliente01', 'PruebaSegura123'));
assert.equal((await banco.iniciarSesion('nuevoUsuario01', 'PruebaSegura123')).cedula, sesion1.cedula);
await assert.rejects(
  banco.actualizarPassword(sesion1.cedula, 'ClaveIncorrecta123', 'OtraClave123', 'OtraClave123'),
  /actual no es correcta/
);
await assert.rejects(
  banco.actualizarPassword(sesion1.cedula, 'PruebaSegura123', 'OtraClave123', 'Diferente123'),
  /no coinciden/
);
await banco.actualizarPassword(sesion1.cedula, 'PruebaSegura123', 'OtraClave123', 'OtraClave123');
await assert.rejects(banco.iniciarSesion('nuevoUsuario01', 'PruebaSegura123'));
assert.equal((await banco.iniciarSesion('nuevoUsuario01', 'OtraClave123')).cedula, sesion1.cedula);

banco.cerrarSesion();
assert.equal(banco.restaurarSesion(), null);
console.log('Pruebas locales OK: registro, acceso, productos, transacciones, transferencia, tarjeta e historial persistente.');
