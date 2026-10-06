import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directorioTemporal = fs.mkdtempSync(path.join(os.tmpdir(), 'mi-plata-'));
const archivoClientes = path.join(directorioTemporal, 'clientes.json');
process.env.CLIENTES_DB_PATH = archivoClientes;

try {
  const { registrar, login } = await import('./services/authService.js');
  const { listarClientes, eliminarCliente } = await import('./repository/clienteRepository.js');
  const datosCliente = {
    cedula: '9876543210',
    nombreCompleto: 'Prueba Persistencia',
    celular: '3001234567',
    usuario: 'prueba01',
    password: 'ClavePrueba123',
    confirmarPassword: 'ClavePrueba123',
  };

  registrar(datosCliente);
  assert.equal(listarClientes().length, 1);

  const datosEnDisco = fs.readFileSync(archivoClientes, 'utf8');
  assert.equal(datosEnDisco.includes(datosCliente.password), false, 'el archivo no debe guardar la contraseña en texto plano');
  assert.match(datosEnDisco, /passwordHash/, 'el archivo debe guardar el hash de la contraseña');

  const codigoVerificacion = `
    import assert from 'node:assert/strict';
    import { login } from './src/services/authService.js';
    import { listarClientes } from './src/repository/clienteRepository.js';
    assert.equal(listarClientes().length, 1);
    assert.ok(login('prueba01', 'ClavePrueba123'));
    console.log('Datos restaurados tras reiniciar el proceso');
  `;
  const raizProyecto = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const procesoNuevo = spawnSync(process.execPath, ['--input-type=module', '-e', codigoVerificacion], {
    cwd: raizProyecto,
    encoding: 'utf8',
    env: { ...process.env, CLIENTES_DB_PATH: archivoClientes },
  });
  assert.equal(procesoNuevo.status, 0, procesoNuevo.stderr || 'falló la restauración del cliente');
  assert.match(procesoNuevo.stdout, /Datos restaurados/);

  assert.ok(eliminarCliente(datosCliente.cedula));
  assert.equal(listarClientes().length, 0);
  assert.deepEqual(JSON.parse(fs.readFileSync(archivoClientes, 'utf8')), []);
  console.log('Prueba de persistencia OK: registro, carga tras reinicio, hash y eliminación.');
} finally {
  fs.rmSync(directorioTemporal, { recursive: true, force: true });
}
