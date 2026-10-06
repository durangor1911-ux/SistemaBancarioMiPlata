// Repositorio de Cuentas - Sistema Bancario Mi Plata
// Persistencia local en data/cuentas.json asociada a cada cliente.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import CuentaAhorros from '../classes/cuentaAhorros.js';
import CuentaCorriente from '../classes/cuentaCorriente.js';
import TarjetaCredito from '../classes/tarjetaCredito.js';

const directorioRepositorio = path.dirname(fileURLToPath(import.meta.url));
const rutaArchivo = process.env.CUENTAS_DB_PATH
    ? path.resolve(process.env.CUENTAS_DB_PATH)
    : path.resolve(directorioRepositorio, '../../data/cuentas.json');

function reconstruirCuenta(datos) {
    let cuenta;
    if (datos.tipo === 'CuentaAhorros') {
        cuenta = new CuentaAhorros(datos.numeroCuenta, Number(datos.saldo) || 0);
    } else if (datos.tipo === 'CuentaCorriente') {
        cuenta = new CuentaCorriente(datos.numeroCuenta, Number(datos.saldo) || 0);
    } else if (datos.tipo === 'TarjetaCredito') {
        return TarjetaCredito.desdePersistencia(datos);
    } else {
        throw new Error(`Tipo de cuenta desconocido: ${datos.tipo}`);
    }
    cuenta.restaurarEstado(datos);
    return cuenta;
}

function cargarCuentas() {
    try {
        const datos = JSON.parse(fs.readFileSync(rutaArchivo, 'utf8'));
        if (!Array.isArray(datos)) throw new Error('El archivo de cuentas no contiene una lista válida');
        return datos.map(registro => ({
            cedulaCliente: registro.cedulaCliente,
            cuenta: reconstruirCuenta(registro.cuenta),
        }));
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw error;
    }
}

const cuentas = cargarCuentas(); // cada elemento: { cedulaCliente, cuenta }

export function persistirCuentas() {
    fs.mkdirSync(path.dirname(rutaArchivo), { recursive: true });
    const temporal = `${rutaArchivo}.tmp`;
    const datos = cuentas.map(({ cedulaCliente, cuenta }) => ({
        cedulaCliente,
        cuenta: cuenta.exportarPersistencia(),
    }));
    fs.writeFileSync(temporal, JSON.stringify(datos, null, 2), { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(temporal, rutaArchivo);
}

/**
 * Guarda una cuenta nueva, asociada a la cédula de su dueño.
 */
export function guardarCuenta(cedulaCliente, cuenta) {
    if (cuentas.some(registro => registro.cuenta.numeroCuenta === cuenta.numeroCuenta)) {
        throw new Error('Ya existe una cuenta con ese número');
    }
    cuentas.push({ cedulaCliente, cuenta });
    persistirCuentas();
    return cuenta;
}

/**
 * Busca una cuenta por su número. Lanza error si no existe.
 */
export function buscarPorNumero(numeroCuenta) {
    const registro = cuentas.find(r => r.cuenta.numeroCuenta === numeroCuenta);
    if (!registro) {
        throw new Error(`No se encontró ninguna cuenta con el número ${numeroCuenta}`);
    }
    return registro.cuenta;
}

/**
 * Retorna todas las cuentas que pertenecen a un cliente específico.
 */
export function listarCuentasPorCliente(cedulaCliente) {
    return cuentas
        .filter(r => r.cedulaCliente === cedulaCliente)
        .map(r => r.cuenta);
}

export function listarRegistrosPorCliente(cedulaCliente) {
    return cuentas.filter(registro => registro.cedulaCliente === cedulaCliente);
}

export function obtenerPropietario(numeroCuenta) {
    return cuentas.find(registro => registro.cuenta.numeroCuenta === numeroCuenta)?.cedulaCliente ?? null;
}

export function eliminarCuentasPorCliente(cedulaCliente) {
    const cantidadAntes = cuentas.length;
    for (let indice = cuentas.length - 1; indice >= 0; indice--) {
        if (cuentas[indice].cedulaCliente === cedulaCliente) cuentas.splice(indice, 1);
    }
    if (cuentas.length !== cantidadAntes) persistirCuentas();
    return cantidadAntes - cuentas.length;
}

/**
 * Retorna todas las cuentas registradas (útil para reportes/admin).
 */
export function listarTodas() {
    return cuentas.map(r => r.cuenta);
}
