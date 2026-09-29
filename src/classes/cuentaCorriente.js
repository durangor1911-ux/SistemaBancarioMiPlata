// Clase CuentaCorriente - Sistema Bancario Mi Plata
// Hereda de Cuenta. Permite retirar hasta un 20% adicional sobre el saldo (sobregiro).

import Cuenta from './cuenta.js';

export default class CuentaCorriente extends Cuenta {

    #sobregiro = 0.20; // 20%

    constructor(numeroCuenta, saldoInicial = 0) {
        super(numeroCuenta, saldoInicial);
    }

    get sobregiro() { return this.#sobregiro; }

    /**
     * Sobrescribe (override) el retirar() de Cuenta.
     * Permite retirar hasta saldo + 20% de sobregiro.
     * Ejemplo: con saldo de $1.000.000, el límite de retiro es $1.200.000.
     */
    retirar(monto) {
        if (monto <= 0) {
            throw new Error("El monto a retirar debe ser mayor a cero");
        }

        const limiteRetiro = this._saldo * (1 + this.#sobregiro);

        if (monto > limiteRetiro) {
            throw new Error(
                `El monto supera el límite permitido (saldo + 20% de sobregiro): $${limiteRetiro.toFixed(2)}`
            );
        }

        this._saldo -= monto;
        this.registrarMovimiento("Retiro", monto);
        return this._saldo;
    }
}
