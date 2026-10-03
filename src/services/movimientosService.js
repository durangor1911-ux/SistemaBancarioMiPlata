// Servicio de Movimientos - Sistema Bancario Mi Plata
// Obtiene el historial de una cuenta, ordenado del más reciente al más antiguo.

import { buscarPorNumero } from '../repository/cuentaRepository.js';

export function obtenerMovimientos(numeroCuenta) {
    const cuenta = buscarPorNumero(numeroCuenta);
    const movimientos = cuenta.movimientos; // ya es una copia (getter definido en Cuenta)
    return movimientos.sort((a, b) => b.fecha - a.fecha);
}
