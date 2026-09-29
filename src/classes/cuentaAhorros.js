// Clase CuentaAhorros - Sistema Bancario Mi Plata
// Hereda de Cuenta. Aplica un interés del 1.5% mensual al momento del retiro.

import Cuenta from './cuenta.js';

export default class CuentaAhorros extends Cuenta {

    #tasaInteres = 0.015; // 1.5% mensual (privado real: nadie más lo necesita modificar)

    constructor(numeroCuenta, saldoInicial = 0) {
        super(numeroCuenta, saldoInicial);
    }

    get tasaInteres() { return this.#tasaInteres; }

    /**
     * Sobrescribe (override) el retirar() de Cuenta.
     * Aplica el interés del 1.5% SOBRE el monto retirado.
     */
    retirar(monto) {
        if (monto <= 0) {
            throw new Error("El monto a retirar debe ser mayor a cero");
        }

        const interes = monto * this.#tasaInteres;
        const totalADescontar = monto + interes;

        if (totalADescontar > this._saldo) {
            throw new Error(
                `Saldo insuficiente. Se requieren $${totalADescontar.toFixed(2)} (incluye 1.5% de interés)`
            );
        }

        this._saldo -= totalADescontar;
        this.registrarMovimiento("Retiro con interés (1.5%)", totalADescontar);
        return this._saldo;
    }
}
