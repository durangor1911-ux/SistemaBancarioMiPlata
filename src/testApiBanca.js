import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const carpetaTemporal = fs.mkdtempSync(path.join(os.tmpdir(), 'mi-plata-api-'));
const puerto = 31000 + Math.floor(Math.random() * 20000);
const baseUrl = `http://localhost:${puerto}`;
const administrador = {
  cedula: '87654321',
  nombreCompleto: 'Administrador de prueba',
  celular: '3001112233',
  usuario: 'adminprueba',
  password: 'AdminPrueba123',
};

const servidor = spawn(process.execPath, ['server.js'], {
  cwd: raiz,
  env: {
    ...process.env,
    PORT: String(puerto),
    CLIENTES_DB_PATH: path.join(carpetaTemporal, 'clientes.json'),
    CUENTAS_DB_PATH: path.join(carpetaTemporal, 'cuentas.json'),
    ADMIN_CEDULA: administrador.cedula,
    ADMIN_NOMBRE: administrador.nombreCompleto,
    ADMIN_CELULAR: administrador.celular,
    ADMIN_USUARIO: administrador.usuario,
    ADMIN_PASSWORD: administrador.password,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let salidaServidor = '';
servidor.stdout.setEncoding('utf8').on('data', texto => { salidaServidor += texto; });
servidor.stderr.setEncoding('utf8').on('data', texto => { salidaServidor += texto; });

async function esperarServidor() {
  for (let intento = 0; intento < 80; intento++) {
    if (servidor.exitCode !== null) throw new Error(`Servidor terminó: ${salidaServidor}`);
    if (salidaServidor.includes(`localhost:${puerto}`)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Tiempo agotado iniciando servidor: ${salidaServidor}`);
}

async function api(ruta, { token, method = 'GET', body } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const respuesta = await fetch(`${baseUrl}${ruta}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: respuesta.status, payload: await respuesta.json() };
}

try {
  await esperarServidor();
  assert.equal((await api('/api/clientes')).status, 403, 'los usuarios anónimos no deben ver clientes');

  const usuario1 = { cedula: '12345678', nombreCompleto: 'Cliente Uno', celular: '3001234567', usuario: 'clienteuno', password: 'ClienteSeguro123', confirmarPassword: 'ClienteSeguro123' };
  const usuario2 = { cedula: '23456789', nombreCompleto: 'Cliente Dos', celular: '3001234568', usuario: 'clientedos', password: 'ClienteSeguro123', confirmarPassword: 'ClienteSeguro123' };
  assert.equal((await api('/api/registro', { method: 'POST', body: usuario1 })).status, 200);
  assert.equal((await api('/api/registro', { method: 'POST', body: usuario2 })).status, 200);

  const ingreso1 = await api('/api/login', { method: 'POST', body: { usuario: usuario1.usuario, password: usuario1.password } });
  const ingreso2 = await api('/api/login', { method: 'POST', body: { usuario: usuario2.usuario, password: usuario2.password } });
  assert.equal(ingreso1.status, 200);
  assert.equal(ingreso2.status, 200);
  const token1 = ingreso1.payload.token;
  const token2 = ingreso2.payload.token;
  assert.equal((await api('/api/clientes', { token: token1 })).status, 403, 'un cliente no debe ver la lista administrativa');

  const cuenta1 = await api('/api/cuentas', { token: token1, method: 'POST', body: { tipo: 'AHORROS' } });
  const cuenta2 = await api('/api/cuentas', { token: token2, method: 'POST', body: { tipo: 'AHORROS' } });
  assert.equal(cuenta1.status, 201);
  assert.equal(cuenta2.status, 201);
  assert.equal((await api('/api/transacciones', { token: token1, method: 'POST', body: { accion: 'consignar', numeroCuenta: cuenta1.payload.cuenta.numeroCuenta, monto: 50000 } })).status, 200);
  assert.equal((await api('/api/transferencias', { token: token1, method: 'POST', body: { cuentaOrigen: cuenta1.payload.cuenta.numeroCuenta, cuentaDestino: cuenta2.payload.cuenta.numeroCuenta, monto: 5000 } })).status, 200);
  assert.equal((await api('/api/transacciones', { token: token2, method: 'POST', body: { accion: 'consignar', numeroCuenta: cuenta1.payload.cuenta.numeroCuenta, monto: 1000 } })).status, 400, 'no debe permitirse operar una cuenta ajena');

  const ingresoAdmin = await api('/api/login', { method: 'POST', body: { usuario: administrador.usuario, password: administrador.password } });
  assert.equal(ingresoAdmin.status, 200);
  assert.equal(ingresoAdmin.payload.sesion.rol, 'ADMIN');
  const clientesAdmin = await api('/api/clientes', { token: ingresoAdmin.payload.token });
  assert.equal(clientesAdmin.status, 200);
  assert.equal(clientesAdmin.payload.clientes.length, 3);
  assert.equal((await api(`/api/clientes/${usuario2.cedula}`, { token: token1, method: 'DELETE' })).status, 403);
  assert.equal((await api(`/api/clientes/${usuario2.cedula}`, { token: ingresoAdmin.payload.token, method: 'DELETE' })).status, 200);

  console.log('API bancaria OK: sesiones, operaciones propias, transferencia entre clientes y acceso de administrador validado.');
} finally {
  servidor.kill();
  fs.rmSync(carpetaTemporal, { recursive: true, force: true });
}
