import { randomBytes } from 'node:crypto';
import CuentaAhorros from '../classes/cuentaAhorros.js';
import CuentaCorriente from '../classes/cuentaCorriente.js';
import TarjetaCredito from '../classes/tarjetaCredito.js';
import { ACCIONES } from '../security/roles.js';
import { obtenerClienteDeSesion, tienePermiso } from './autorizacionService.js';
import { listarCuentasPorCliente, listarRegistrosPorCliente, obtenerPropietario, buscarPorNumero, guardarCuenta, persistirCuentas } from '../repository/cuentaRepository.js';
import { consignar, retirar } from './transaccionesService.js';
import { transferir } from './transferenciaService.js';
import { obtenerMovimientos } from './movimientosService.js';

const CUPO_TARJETA_INICIAL = 1000000;

function exigirCliente(token) {
  const cliente = obtenerClienteDeSesion(token);
  if (!cliente) throw new Error('Sesión inválida o vencida. Inicia sesión de nuevo.');
  if (cliente.bloqueado) throw new Error('La cuenta está bloqueada.');
  return cliente;
}

function exigirPermiso(token, accion) {
  exigirCliente(token);
  if (!tienePermiso(token, accion)) throw new Error('No tienes permiso para realizar esta operación.');
}

function exigirCuentaPropia(token, numeroCuenta) {
  const cliente = exigirCliente(token);
  if (obtenerPropietario(numeroCuenta) !== cliente.cedula) {
    throw new Error('La cuenta no existe o no te pertenece.');
  }
  return buscarPorNumero(numeroCuenta);
}

function exigirMonto(monto) {
  const valor = Number(monto);
  if (!Number.isFinite(valor) || valor <= 0) throw new Error('Ingresa un monto numérico mayor que cero.');
  return valor;
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

export function obtenerResumenSesion(token) {
  const cliente = exigirCliente(token);
  return {
    cedula: cliente.cedula,
    nombreCompleto: cliente.nombreCompleto,
    celular: cliente.celular,
    usuario: cliente.usuario,
    rol: cliente.rol,
    cuentas: listarCuentasPorCliente(cliente.cedula).map(presentarCuenta),
  };
}

export function abrirProducto(token, tipo) {
  const cliente = exigirCliente(token);
  const sufijo = randomBytes(5).toString('hex').toUpperCase();
  let cuenta;
  if (tipo === 'AHORROS') {
    cuenta = new CuentaAhorros(`AH-${sufijo}`);
  } else if (tipo === 'CORRIENTE') {
    cuenta = new CuentaCorriente(`CC-${sufijo}`);
  } else if (tipo === 'TARJETA_CREDITO') {
    cuenta = new TarjetaCredito(`TC-${sufijo}`, CUPO_TARJETA_INICIAL);
  } else {
    throw new Error('Tipo de producto inválido. Elige ahorros, corriente o tarjeta de crédito.');
  }
  guardarCuenta(cliente.cedula, cuenta);
  return presentarCuenta(cuenta);
}

export function operarCuenta(token, accion, numeroCuenta, monto) {
  if (accion !== 'consignar' && accion !== 'retirar') throw new Error('Operación no válida.');
  const permiso = accion === 'consignar' ? ACCIONES.CONSIGNAR : ACCIONES.RETIRAR;
  exigirPermiso(token, permiso);
  const cuenta = exigirCuentaPropia(token, numeroCuenta);
  if (cuenta instanceof TarjetaCredito) {
    throw new Error('Las tarjetas de crédito no admiten consignaciones ni retiros en efectivo.');
  }
  const valor = exigirMonto(monto);
  const saldo = accion === 'consignar'
    ? consignar(numeroCuenta, valor)
    : retirar(numeroCuenta, valor);
  persistirCuentas();
  return { numeroCuenta, accion, monto: valor, saldo };
}

export function hacerTransferencia(token, origenNumero, destinoNumero, monto) {
  exigirPermiso(token, ACCIONES.TRANSFERIR);
  const cliente = exigirCliente(token);
  const origen = exigirCuentaPropia(token, origenNumero);
  const destino = buscarPorNumero(destinoNumero);
  if (origen instanceof TarjetaCredito) throw new Error('No se puede transferir desde una tarjeta de crédito.');
  if (destino instanceof TarjetaCredito) throw new Error('No se puede transferir a una tarjeta de crédito.');
  const valor = exigirMonto(monto);
  const resultado = transferir(cliente.cedula, origenNumero, destinoNumero, valor);
  persistirCuentas();
  return resultado;
}

export function listarMovimientos(token, numeroCuenta) {
  exigirPermiso(token, ACCIONES.VER_MOVIMIENTOS);
  exigirCuentaPropia(token, numeroCuenta);
  return obtenerMovimientos(numeroCuenta).map(movimiento => ({
    ...movimiento,
    fecha: movimiento.fecha instanceof Date ? movimiento.fecha.toISOString() : movimiento.fecha,
  }));
}

export function comprarConTarjeta(token, numeroCuenta, monto, cuotas) {
  exigirPermiso(token, ACCIONES.CONSIGNAR);
  const tarjeta = exigirCuentaPropia(token, numeroCuenta);
  if (!(tarjeta instanceof TarjetaCredito)) throw new Error('El producto seleccionado no es una tarjeta de crédito.');
  const valor = exigirMonto(monto);
  const numeroCuotas = Number(cuotas);
  if (!Number.isInteger(numeroCuotas) || numeroCuotas < 1 || numeroCuotas > 48) {
    throw new Error('El número de cuotas debe estar entre 1 y 48.');
  }
  const cuotaMensual = tarjeta.calcularCuota(valor, numeroCuotas);
  persistirCuentas();
  return {
    numeroCuenta,
    monto: valor,
    cuotas: numeroCuotas,
    cuotaMensual,
    deuda: tarjeta.deuda,
    cupoDisponible: tarjeta.cupoDisponible,
  };
}

export function pagarTarjeta(token, numeroTarjeta, numeroCuentaOrigen, monto) {
  exigirPermiso(token, ACCIONES.RETIRAR);
  const tarjeta = exigirCuentaPropia(token, numeroTarjeta);
  const origen = exigirCuentaPropia(token, numeroCuentaOrigen);
  if (!(tarjeta instanceof TarjetaCredito)) throw new Error('El producto seleccionado no es una tarjeta de crédito.');
  if (origen instanceof TarjetaCredito) throw new Error('El pago debe salir de una cuenta de ahorros o corriente.');
  const valor = exigirMonto(monto);
  if (valor > tarjeta.deuda) throw new Error('El pago no puede superar la deuda de la tarjeta.');
  retirar(numeroCuentaOrigen, valor);
  tarjeta.abonar(valor);
  persistirCuentas();
  return { numeroTarjeta, numeroCuentaOrigen, monto: valor, deuda: tarjeta.deuda, cupoDisponible: tarjeta.cupoDisponible };
}

export function listarProductos(token) {
  const cliente = exigirCliente(token);
  return listarRegistrosPorCliente(cliente.cedula).map(({ cuenta }) => presentarCuenta(cuenta));
}
