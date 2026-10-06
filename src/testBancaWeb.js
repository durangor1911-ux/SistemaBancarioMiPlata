import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const carpetaTemporal = fs.mkdtempSync(path.join(os.tmpdir(), 'mi-plata-banca-'));
process.env.CLIENTES_DB_PATH = path.join(carpetaTemporal, 'clientes.json');
process.env.CUENTAS_DB_PATH = path.join(carpetaTemporal, 'cuentas.json');

try {
  const { registrar, login } = await import('./services/authService.js');
  const {
    abrirProducto,
    operarCuenta,
    hacerTransferencia,
    comprarConTarjeta,
    pagarTarjeta,
    listarProductos,
    listarMovimientos,
  } = await import('./services/cuentasService.js');

  const datos = (cedula, usuario) => ({
    cedula,
    nombreCompleto: usuario,
    celular: '3001234567',
    usuario,
    password: 'PruebaSegura123',
    confirmarPassword: 'PruebaSegura123',
  });
  registrar(datos('12345678', 'cliente01'));
  registrar(datos('23456789', 'cliente02'));
  const token1 = login('cliente01', 'PruebaSegura123');
  const token2 = login('cliente02', 'PruebaSegura123');

  const ahorros1 = abrirProducto(token1, 'AHORROS');
  const corriente1 = abrirProducto(token1, 'CORRIENTE');
  const tarjeta1 = abrirProducto(token1, 'TARJETA_CREDITO');
  const ahorros2 = abrirProducto(token2, 'AHORROS');

  operarCuenta(token1, 'consignar', ahorros1.numeroCuenta, 100000);
  operarCuenta(token1, 'consignar', corriente1.numeroCuenta, 150000);
  const transferencia = hacerTransferencia(token1, ahorros1.numeroCuenta, ahorros2.numeroCuenta, 10000);
  assert.equal(transferencia.monto, 10000);
  assert.throws(() => hacerTransferencia(token2, ahorros1.numeroCuenta, ahorros2.numeroCuenta, 1000), /no existe o no te pertenece/);

  const compra = comprarConTarjeta(token1, tarjeta1.numeroCuenta, 100000, 3);
  assert.equal(compra.deuda, 100000);
  const pago = pagarTarjeta(token1, tarjeta1.numeroCuenta, corriente1.numeroCuenta, 50000);
  assert.equal(pago.deuda, 50000);

  const productosAntesDelReinicio = listarProductos(token1);
  assert.equal(productosAntesDelReinicio.length, 3);
  assert.equal(productosAntesDelReinicio.find(cuenta => cuenta.numeroCuenta === tarjeta1.numeroCuenta).deuda, 50000);
  assert.ok(listarMovimientos(token1, ahorros1.numeroCuenta).length >= 2);

  const codigoVerificacion = `
    import assert from 'node:assert/strict';
    import { login } from './src/services/authService.js';
    import { listarProductos } from './src/services/cuentasService.js';
    const token = login('cliente01', 'PruebaSegura123');
    const productos = listarProductos(token);
    assert.equal(productos.length, 3);
    assert.equal(productos.find(cuenta => cuenta.tipo === 'TarjetaCredito').deuda, 50000);
    console.log('Productos y deuda restaurados tras reiniciar');
  `;
  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const proceso = spawnSync(process.execPath, ['--input-type=module', '-e', codigoVerificacion], {
    cwd: raiz,
    encoding: 'utf8',
    env: process.env,
  });
  assert.equal(proceso.status, 0, proceso.stderr || 'falló la restauración de productos');
  assert.match(proceso.stdout, /restaurados tras reiniciar/);

  console.log('Prueba bancaria OK: autorización por propietario, consignación, transferencia, historial, tarjeta, pago y persistencia.');
} finally {
  fs.rmSync(carpetaTemporal, { recursive: true, force: true });
}
