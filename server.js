import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { registrar, login, logout, crearAdministrador } from './src/services/authService.js';
import { listarClientes, eliminarCliente, buscarPorCedula } from './src/repository/clienteRepository.js';
import { ACCIONES, ROLES } from './src/security/roles.js';
import { tienePermiso, obtenerClienteDeSesion } from './src/services/autorizacionService.js';
import { eliminarCuentasPorCliente } from './src/repository/cuentaRepository.js';
import {
  obtenerResumenSesion,
  abrirProducto,
  operarCuenta,
  hacerTransferencia,
  listarMovimientos,
  comprarConTarjeta,
  pagarTarjeta,
  listarProductos,
} from './src/services/cuentasService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);

function inicializarAdministrador() {
  const { ADMIN_CEDULA, ADMIN_NOMBRE, ADMIN_CELULAR, ADMIN_USUARIO, ADMIN_PASSWORD } = process.env;
  if (![ADMIN_CEDULA, ADMIN_NOMBRE, ADMIN_CELULAR, ADMIN_USUARIO, ADMIN_PASSWORD].every(Boolean)) {
    const existeAdministrador = listarClientes().some(cliente => cliente.rol === ROLES.ADMIN);
    if (!existeAdministrador) {
      console.info('No hay un administrador. Define ADMIN_CEDULA, ADMIN_NOMBRE, ADMIN_CELULAR, ADMIN_USUARIO y ADMIN_PASSWORD para crearlo.');
    }
    return;
  }

  const existente = buscarPorCedula(ADMIN_CEDULA);
  if (existente) {
    if (existente.rol !== ROLES.ADMIN) {
      console.warn('La cédula configurada para ADMIN ya pertenece a un usuario CLIENTE. Usa otra cédula.');
    }
    return;
  }

  try {
    crearAdministrador({
      cedula: ADMIN_CEDULA,
      nombreCompleto: ADMIN_NOMBRE,
      celular: ADMIN_CELULAR,
      usuario: ADMIN_USUARIO,
      password: ADMIN_PASSWORD,
      confirmarPassword: ADMIN_PASSWORD,
    });
    console.info(`Administrador inicial configurado: ${ADMIN_USUARIO}`);
  } catch (error) {
    console.error(`No se pudo configurar el administrador: ${error.message}`);
  }
}

inicializarAdministrador();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    let datos = '';

    req.on('data', (chunk) => {
      datos += chunk;
      if (datos.length > 1e6) {
        req.destroy();
        reject(new Error('El cuerpo de la peticion es demasiado grande'));
      }
    });

    req.on('end', () => resolve(datos));
    req.on('error', reject);
  });
}

async function responderJson(res, codigo, payload) {
  res.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function obtenerToken(req) {
  const autorizacion = req.headers.authorization || '';
  return autorizacion.startsWith('Bearer ') ? autorizacion.slice(7) : '';
}

function configurarCors(req, res) {
  const origen = req.headers.origin;
  if (!origen) return;

  try {
    const hostname = new URL(origen).hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      res.setHeader('Access-Control-Allow-Origin', origen);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
  } catch {
    // Ignorar encabezados Origin mal formados.
  }
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  configurarCors(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (url.pathname === '/api/registro' && req.method === 'POST') {
    try {
      const cuerpo = await leerCuerpo(req);
      const datos = JSON.parse(cuerpo || '{}');
      const cliente = registrar(datos);
      const clientePlano = {
        cedula: cliente.cedula,
        nombreCompleto: cliente.nombreCompleto,
        celular: cliente.celular,
        usuario: cliente.usuario,
        rol: cliente.rol,
      };
      await responderJson(res, 200, { ok: true, cliente: clientePlano });
    } catch (error) {
      await responderJson(res, 400, { ok: false, message: error.message });
    }
    return;
  }

  if (url.pathname === '/api/login' && req.method === 'POST') {
    try {
      const cuerpo = await leerCuerpo(req);
      const datos = JSON.parse(cuerpo || '{}');
      const token = login(datos.usuario, datos.password);
      await responderJson(res, 200, { ok: true, token, sesion: obtenerResumenSesion(token) });
    } catch (error) {
      await responderJson(res, 401, { ok: false, message: error.message });
    }
    return;
  }

  if (url.pathname === '/api/logout' && req.method === 'POST') {
    try {
      const cuerpo = await leerCuerpo(req);
      const datos = JSON.parse(cuerpo || '{}');
      const ok = logout(datos.token);
      await responderJson(res, 200, { ok, message: ok ? 'Sesion cerrada' : 'No habia sesion activa' });
    } catch (error) {
      await responderJson(res, 400, { ok: false, message: error.message });
    }
    return;
  }

  if (url.pathname === '/api/sesion' && req.method === 'GET') {
    try {
      const sesion = obtenerResumenSesion(obtenerToken(req));
      await responderJson(res, 200, { ok: true, sesion });
    } catch (error) {
      await responderJson(res, 401, { ok: false, message: error.message });
    }
    return;
  }

  if (url.pathname === '/api/cuentas' && req.method === 'GET') {
    try {
      await responderJson(res, 200, { ok: true, cuentas: listarProductos(obtenerToken(req)) });
    } catch (error) {
      await responderJson(res, 401, { ok: false, message: error.message });
    }
    return;
  }

  if (url.pathname === '/api/cuentas' && req.method === 'POST') {
    try {
      const datos = JSON.parse(await leerCuerpo(req) || '{}');
      const cuenta = abrirProducto(obtenerToken(req), datos.tipo);
      await responderJson(res, 201, { ok: true, cuenta });
    } catch (error) {
      await responderJson(res, 400, { ok: false, message: error.message });
    }
    return;
  }

  if (url.pathname === '/api/transacciones' && req.method === 'POST') {
    try {
      const datos = JSON.parse(await leerCuerpo(req) || '{}');
      const resultado = operarCuenta(obtenerToken(req), datos.accion, datos.numeroCuenta, datos.monto);
      await responderJson(res, 200, { ok: true, resultado });
    } catch (error) {
      await responderJson(res, 400, { ok: false, message: error.message });
    }
    return;
  }

  if (url.pathname === '/api/transferencias' && req.method === 'POST') {
    try {
      const datos = JSON.parse(await leerCuerpo(req) || '{}');
      const resultado = hacerTransferencia(
        obtenerToken(req),
        datos.cuentaOrigen,
        datos.cuentaDestino,
        datos.monto
      );
      await responderJson(res, 200, { ok: true, resultado });
    } catch (error) {
      await responderJson(res, 400, { ok: false, message: error.message });
    }
    return;
  }

  if (url.pathname === '/api/tarjetas/compra' && req.method === 'POST') {
    try {
      const datos = JSON.parse(await leerCuerpo(req) || '{}');
      const resultado = comprarConTarjeta(
        obtenerToken(req),
        datos.numeroCuenta,
        datos.monto,
        datos.cuotas
      );
      await responderJson(res, 200, { ok: true, resultado });
    } catch (error) {
      await responderJson(res, 400, { ok: false, message: error.message });
    }
    return;
  }

  if (url.pathname === '/api/tarjetas/pago' && req.method === 'POST') {
    try {
      const datos = JSON.parse(await leerCuerpo(req) || '{}');
      const resultado = pagarTarjeta(
        obtenerToken(req),
        datos.numeroTarjeta,
        datos.numeroCuentaOrigen,
        datos.monto
      );
      await responderJson(res, 200, { ok: true, resultado });
    } catch (error) {
      await responderJson(res, 400, { ok: false, message: error.message });
    }
    return;
  }

  if (url.pathname.startsWith('/api/movimientos/') && req.method === 'GET') {
    try {
      const numeroCuenta = decodeURIComponent(url.pathname.split('/').pop());
      const movimientos = listarMovimientos(obtenerToken(req), numeroCuenta);
      await responderJson(res, 200, { ok: true, movimientos });
    } catch (error) {
      await responderJson(res, 400, { ok: false, message: error.message });
    }
    return;
  }

  if (url.pathname === '/api/clientes' && req.method === 'GET') {
    if (!tienePermiso(obtenerToken(req), ACCIONES.VER_CLIENTES)) {
      await responderJson(res, 403, { ok: false, message: 'Solo un administrador autenticado puede ver los usuarios.' });
      return;
    }
    await responderJson(res, 200, { ok: true, clientes: listarClientes() });
    return;
  }

  if (url.pathname.startsWith('/api/clientes/') && req.method === 'DELETE') {
    try {
      const token = obtenerToken(req);
      if (!tienePermiso(token, ACCIONES.ELIMINAR_CLIENTE)) {
        await responderJson(res, 403, { ok: false, message: 'Solo un administrador autenticado puede eliminar usuarios.' });
        return;
      }
      const cedula = decodeURIComponent(url.pathname.split('/').pop());
      const objetivo = buscarPorCedula(cedula);
      if (!objetivo) {
        await responderJson(res, 404, { ok: false, message: 'Cliente no encontrado' });
        return;
      }
      if (objetivo.rol === ROLES.ADMIN || obtenerClienteDeSesion(token)?.cedula === cedula) {
        await responderJson(res, 403, { ok: false, message: 'No se puede eliminar una cuenta de administrador.' });
        return;
      }
      eliminarCuentasPorCliente(cedula);
      const clienteEliminado = eliminarCliente(cedula);

      if (!clienteEliminado) {
        await responderJson(res, 404, { ok: false, message: 'Cliente no encontrado' });
        return;
      }

      await responderJson(res, 200, {
        ok: true,
        message: 'Cliente eliminado',
        cliente: {
          cedula: clienteEliminado.cedula,
          usuario: clienteEliminado.usuario,
        },
      });
    } catch (error) {
      await responderJson(res, 400, { ok: false, message: error.message });
    }
    return;
  }

  let rutaSolicitada = url.pathname === '/' ? '/index.html' : url.pathname;
  const rutaArchivo = path.normalize(path.join(__dirname, rutaSolicitada));

  if (!rutaArchivo.startsWith(__dirname)) {
    await responderJson(res, 403, { ok: false, message: 'Acceso denegado' });
    return;
  }

  try {
    const archivo = await fs.readFile(rutaArchivo);
    const extension = path.extname(rutaArchivo).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[extension] || 'application/octet-stream' });
    res.end(archivo);
  } catch (error) {
    await responderJson(res, 404, { ok: false, message: 'No encontrado' });
  }
});

servidor.listen(PORT, () => {
  const puertoActivo = servidor.address().port;
  console.log(`Servidor web activo: http://localhost:${puertoActivo}/index.html`);
});
