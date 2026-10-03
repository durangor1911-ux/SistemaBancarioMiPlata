// Servicio de Transacciones - Sistema Bancario Mi Plata
// Orquesta las operaciones básicas: busca la cuenta en el repositorio
// y llama a los métodos que Paola ya implementó en cada clase.
// No reimplementa reglas de negocio (interés, sobregiro, etc.) — esas
// ya viven en CuentaAhorros, CuentaCorriente y TarjetaCredito.

import { buscarPorNumero } from '../repository/cuentaRepository.js';

export function consultarSaldo(numeroCuenta) {
    const cuenta = buscarPorNumero(numeroCuenta);
    return cuenta.consultarSaldo();
}

export function consignar(numeroCuenta, monto) {
    const cuenta = buscarPorNumero(numeroCuenta);
    return cuenta.consignar(monto);
}

export function retirar(numeroCuenta, monto) {
    const cuenta = buscarPorNumero(numeroCuenta);
    // Polimorfismo: cada tipo de cuenta aplica su propia regla al retirar
    // (CuentaAhorros aplica interés, CuentaCorriente permite sobregiro,
    // TarjetaCredito lanza error porque no soporta retiros directos).
    return cuenta.retirar(monto);
}
