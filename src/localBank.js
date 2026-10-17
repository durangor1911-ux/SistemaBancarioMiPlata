import CuentaAhorros from './classes/cuentaAhorros.js';
import CuentaCorriente from './classes/cuentaCorriente.js';
import TarjetaCredito from './classes/tarjetaCredito.js';
import { validarCedula, validarPassword, validarUsuario } from './security/validadores.js';

const DATA_KEY = 'miPlataDatosLocales';
const SESSION_KEY = 'miPlataSesionLocal';
const ITERACIONES_HASH = 210000;
const CUPO_TARJETA_INICIAL = 1000000;

function almacenamiento() {
  if (!globalThis.localStorage) throw new Error('El navegador no permite guardar datos localmente.');
  return globalThis.localStorage;
}

function leerDatos() {
  const raw = almacenamiento().getItem(DATA_KEY);
  if (!raw) return { clientes: [], cuentas: [] };
  try {
    const datos = JSON.parse(raw);
    return {
      clientes: Array.isArray(datos.clientes) ? datos.clientes : [],
      cuentas: Array.isArray(datos.cuentas) ? datos.cuentas : [],
    };
  } catch {
    throw new Error('Los datos locales están dañados y no se pudieron leer.');
  }
}

function guardarDatos(datos) {
  try {
    almacenamiento().setItem(DATA_KEY, JSON.stringify(datos));
  } catch {
    throw new Error('No se pudieron guardar los datos. Revisa el espacio disponible del navegador.');
  }
}

function aBytesBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

function desdeBase64(texto) {
  return Uint8Array.from(atob(texto), caracter => caracter.charCodeAt(0));
}

function exigirWebCrypto() {
  if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) {
    throw new Error('Para guardar contraseñas con protección, abre el sistema desde http://localhost con npm start.');
  }
  return globalThis.crypto;
}

async function hashearPassword(password, sal = null) {
  const cryptoApi = exigirWebCrypto();
  const bytesSal = sal ?? cryptoApi.getRandomValues(new Uint8Array(16));
  const clave = await cryptoApi.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await cryptoApi.subtle.deriveBits(
    { name: 'PBKDF2', salt: bytesSal, iterations: ITERACIONES_HASH, hash: 'SHA-256' },
    clave,
    256
  );
  return `${ITERACIONES_HASH}:${aBytesBase64(bytesSal)}:${aBytesBase64(new Uint8Array(bits))}`;
}

async function verificarPassword(password, hashGuardado) {
  try {
    const [iteraciones, sal, hash] = hashGuardado.split(':');
    const calculado = await hashearPassword(password, desdeBase64(sal));
    const bytesCalculados = desdeBase64(calculado.split(':')[2]);
    const bytesGuardados = desdeBase64(hash);
    if (Number(iteraciones) !== ITERACIONES_HASH || bytesCalculados.length !== bytesGuardados.length) return false;
    let diferencia = 0;
    for (let indice = 0; indice < bytesCalculados.length; indice++) {
      diferencia |= bytesCalculados[indice] ^ bytesGuardados[indice];
    }
    return diferencia === 0;
  } catch {
    return false;
  }
}

function vistaCliente(cliente) {
  return {
    cedula: cliente.cedula,
    nombreCompleto: cliente.nombreCompleto,
    celular: cliente.celular,
    usuario: cliente.usuario,
    rol: cliente.rol || 'CLIENTE',
  };
}

function cuentaDesdeRegistro(registro) {
  const datos = registro.cuenta;
  let cuenta;
  if (datos.tipo === 'CuentaAhorros') cuenta = new CuentaAhorros(datos.numeroCuenta, Number(datos.saldo) || 0);
  else if (datos.tipo === 'CuentaCorriente') cuenta = new CuentaCorriente(datos.numeroCuenta, Number(datos.saldo) || 0);
  else if (datos.tipo === 'TarjetaCredito') return TarjetaCredito.desdePersistencia(datos);
  else throw new Error(`Tipo de producto desconocido: ${datos.tipo}`);
  cuenta.restaurarEstado(datos);
  return cuenta;
}

function cargarCuentas(datos) {
  return datos.cuentas.map(registro => ({ cedulaCliente: registro.cedulaCliente, cuenta: cuentaDesdeRegistro(registro) }));
}

function persistirCuentas(datos, cuentas) {
  datos.cuentas = cuentas.map(({ cedulaCliente, cuenta }) => ({ cedulaCliente, cuenta: cuenta.exportarPersistencia() }));
  guardarDatos(datos);
}

function exigirCliente(cedula) {
  const cliente = leerDatos().clientes.find(item => item.cedula === cedula);
  if (!cliente || cliente.bloqueado) throw new Error('La sesión no es válida. Inicia sesión nuevamente.');
  return cliente;
}

function exigirMonto(monto) {
  const valor = Number(monto);
  if (!Number.isFinite(valor) || valor <= 0) throw new Error('Ingresa un monto numérico mayor que cero.');
  return valor;
}

function exigirCuentaPropia(cuentas, cedula, numeroCuenta) {
  const registro = cuentas.find(item => item.cuenta.numeroCuenta === numeroCuenta && item.cedulaCliente === cedula);
  if (!registro) throw new Error('La cuenta no existe o no te pertenece.');
  return registro.cuenta;
}

function presentarCuenta(cuenta) {
  const resumen = {
    numeroCuenta: cuenta.numeroCuenta,
    tipo: cuenta.constructor.name,
    saldo: cuenta.consultarSaldo(),
  };
  if (cuenta instanceof TarjetaCredito) {
    resumen.cupo = cuenta.cupo;
    resumen.deuda = cuenta.deuda;
    resumen.cupoDisponible = cuenta.cupoDisponible;
  }
  return resumen;
}

function crearResumenSesion(cliente) {
  return vistaCliente(cliente);
}

export async function registrar(datos) {
  validarCedula(datos.cedula);
  validarUsuario(datos.usuario);
  validarPassword(datos.password);
  if (!datos.nombreCompleto?.trim() || !datos.celular?.trim()) throw new Error('Todos los campos son obligatorios.');
  if (datos.password !== datos.confirmarPassword) throw new Error('La contraseña y su confirmación no coinciden.');

  const estado = leerDatos();
  if (estado.clientes.some(cliente => cliente.cedula === datos.cedula)) throw new Error('Ya existe un usuario con esa cédula.');
  if (estado.clientes.some(cliente => cliente.usuario.toLowerCase() === datos.usuario.toLowerCase())) throw new Error('Ese nombre de usuario ya está registrado.');

  estado.clientes.push({
    cedula: datos.cedula,
    nombreCompleto: datos.nombreCompleto.trim(),
    celular: datos.celular.trim(),
    usuario: datos.usuario.trim(),
    passwordHash: await hashearPassword(datos.password),
    rol: 'CLIENTE',
    intentosFallidos: 0,
    bloqueado: false,
  });
  guardarDatos(estado);
  return vistaCliente(estado.clientes.at(-1));
}

export async function iniciarSesion(usuario, password) {
  const estado = leerDatos();
  const cliente = estado.clientes.find(item => item.usuario.toLowerCase() === usuario.toLowerCase());
  if (!cliente || cliente.bloqueado) throw new Error('Usuario o contraseña incorrectos, o cuenta bloqueada.');

  if (!(await verificarPassword(password, cliente.passwordHash))) {
    cliente.intentosFallidos = (cliente.intentosFallidos || 0) + 1;
    if (cliente.intentosFallidos >= 3) cliente.bloqueado = true;
    guardarDatos(estado);
    throw new Error(cliente.bloqueado
      ? 'La cuenta se bloqueó por tres intentos fallidos. Contacta al administrador del sistema.'
      : `Usuario o contraseña incorrectos. Intento ${cliente.intentosFallidos} de 3.`);
  }

  cliente.intentosFallidos = 0;
  guardarDatos(estado);
  almacenamiento().setItem(SESSION_KEY, cliente.cedula);
  return crearResumenSesion(cliente);
}

export function restaurarSesion() {
  const cedula = almacenamiento().getItem(SESSION_KEY);
  if (!cedula) return null;
  try {
    return crearResumenSesion(exigirCliente(cedula));
  } catch {
    almacenamiento().removeItem(SESSION_KEY);
    return null;
  }
}

export function cerrarSesion() {
  almacenamiento().removeItem(SESSION_KEY);
}

export function listarProductos(cedula) {
  exigirCliente(cedula);
  return cargarCuentas(leerDatos())
    .filter(registro => registro.cedulaCliente === cedula)
    .map(registro => presentarCuenta(registro.cuenta));
}

export function abrirProducto(cedula, tipo) {
  exigirCliente(cedula);
  const sufijo = exigirWebCrypto().randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase();
  let cuenta;
  if (tipo === 'AHORROS') cuenta = new CuentaAhorros(`AH-${sufijo}`);
  else if (tipo === 'CORRIENTE') cuenta = new CuentaCorriente(`CC-${sufijo}`);
  else if (tipo === 'TARJETA_CREDITO') cuenta = new TarjetaCredito(`TC-${sufijo}`, CUPO_TARJETA_INICIAL);
  else throw new Error('Tipo de producto inválido.');

  const datos = leerDatos();
  const cuentas = cargarCuentas(datos);
  cuentas.push({ cedulaCliente: cedula, cuenta });
  persistirCuentas(datos, cuentas);
  return presentarCuenta(cuenta);
}

export function operarCuenta(cedula, accion, numeroCuenta, monto) {
  exigirCliente(cedula);
  if (accion !== 'consignar' && accion !== 'retirar') throw new Error('Operación no válida.');
  const datos = leerDatos();
  const cuentas = cargarCuentas(datos);
  const cuenta = exigirCuentaPropia(cuentas, cedula, numeroCuenta);
  if (cuenta instanceof TarjetaCredito) throw new Error('Las tarjetas no admiten consignaciones ni retiros en efectivo.');
  const valor = exigirMonto(monto);
  const saldo = accion === 'consignar' ? cuenta.consignar(valor) : cuenta.retirar(valor);
  persistirCuentas(datos, cuentas);
  return { numeroCuenta, accion, monto: valor, saldo };
}

export function hacerTransferencia(cedula, origenNumero, destinoNumero, monto) {
  exigirCliente(cedula);
  const datos = leerDatos();
  const cuentas = cargarCuentas(datos);
  const origen = exigirCuentaPropia(cuentas, cedula, origenNumero);
  const destinoRegistro = cuentas.find(registro => registro.cuenta.numeroCuenta === destinoNumero);
  if (!destinoRegistro) throw new Error('No se encontró la cuenta de destino.');
  const destino = destinoRegistro.cuenta;
  if (origenNumero === destinoNumero) throw new Error('No se puede transferir a la misma cuenta.');
  if (origen instanceof TarjetaCredito || destino instanceof TarjetaCredito) throw new Error('No se permiten transferencias desde o hacia una tarjeta de crédito.');
  if (destinoRegistro.cedulaCliente === cedula && origen.constructor.name === destino.constructor.name) {
    throw new Error('No se permite transferir entre cuentas propias del mismo tipo.');
  }
  const valor = exigirMonto(monto);
  origen.retirar(valor);
  destino.consignar(valor);
  persistirCuentas(datos, cuentas);
  return { origen: origenNumero, destino: destinoNumero, monto: valor };
}

export function comprarConTarjeta(cedula, numeroCuenta, monto, cuotas) {
  exigirCliente(cedula);
  const datos = leerDatos();
  const cuentas = cargarCuentas(datos);
  const tarjeta = exigirCuentaPropia(cuentas, cedula, numeroCuenta);
  if (!(tarjeta instanceof TarjetaCredito)) throw new Error('El producto seleccionado no es una tarjeta de crédito.');
  const valor = exigirMonto(monto);
  const numeroCuotas = Number(cuotas);
  if (!Number.isInteger(numeroCuotas) || numeroCuotas < 1 || numeroCuotas > 48) throw new Error('El número de cuotas debe estar entre 1 y 48.');
  const cuotaMensual = tarjeta.calcularCuota(valor, numeroCuotas);
  persistirCuentas(datos, cuentas);
  return { numeroCuenta, monto: valor, cuotas: numeroCuotas, cuotaMensual, deuda: tarjeta.deuda, cupoDisponible: tarjeta.cupoDisponible };
}

export function pagarTarjeta(cedula, numeroTarjeta, numeroCuentaOrigen, monto) {
  exigirCliente(cedula);
  const datos = leerDatos();
  const cuentas = cargarCuentas(datos);
  const tarjeta = exigirCuentaPropia(cuentas, cedula, numeroTarjeta);
  const origen = exigirCuentaPropia(cuentas, cedula, numeroCuentaOrigen);
  if (!(tarjeta instanceof TarjetaCredito)) throw new Error('El producto seleccionado no es una tarjeta de crédito.');
  if (origen instanceof TarjetaCredito) throw new Error('El pago debe salir de una cuenta de ahorros o corriente.');
  const valor = exigirMonto(monto);
  if (valor > tarjeta.deuda) throw new Error('El pago no puede superar la deuda de la tarjeta.');
  origen.retirar(valor);
  tarjeta.abonar(valor);
  persistirCuentas(datos, cuentas);
  return { numeroTarjeta, numeroCuentaOrigen, monto: valor, deuda: tarjeta.deuda, cupoDisponible: tarjeta.cupoDisponible };
}

export function listarMovimientos(cedula, numeroCuenta) {
  exigirCliente(cedula);
  const cuenta = exigirCuentaPropia(cargarCuentas(leerDatos()), cedula, numeroCuenta);
  return cuenta.movimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}
