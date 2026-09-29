// Clase TarjetaCredito - Sistema Bancario Mi Plata
// Hereda de Cuenta. Permite financiar compras a cuotas, aplicando la tasa
// de interés correspondiente según el número de cuotas elegido.

import Cuenta from './cuenta.js';

export default class TarjetaCredito extends Cuenta {

    #cupo;
    #deuda;

    constructor(numeroCuenta, cupo) {
        super(numeroCuenta, 0); // una tarjeta no maneja "saldo" como las cuentas normales
        this.#cupo = cupo;
        this.#deuda = 0;
    }

    get cupo() { return this.#cupo; }
    get deuda() { return this.#deuda; }
    get cupoDisponible() { return this.#cupo - this.#deuda; }

    /**
     * Una tarjeta de crédito no "retira" dinero de un saldo como una cuenta.
     * Se sobrescribe retirar() para dejarlo explícitamente no soportado,
     * en vez de heredar silenciosamente un comportamiento que no aplica aquí.
     */
    retirar(monto) {
        throw new Error("TarjetaCredito no soporta retiros directos. Use calcularCuota() para financiar una compra.");
    }

    /**
     * Calcula el valor de la cuota mensual para financiar una compra.
     * Tasas según el número de cuotas (definidas en los requisitos del proyecto):
     *   <= 2 cuotas: 0% (sin interés)
     *   3 a 6 cuotas: 1.9% mensual
     *   >= 7 cuotas: 2.3% mensual
     *
     * Fórmula: cuota = (capital * tasa) / (1 - (1 + tasa)^(-n))
     */
    calcularCuota(monto, numeroCuotas) {
        if (monto <= 0 || numeroCuotas <= 0) {
            throw new Error("El monto y el número de cuotas deben ser mayores a cero");
        }
        if ((this.#deuda + monto) > this.#cupo) {
            throw new Error("El monto supera el cupo disponible");
        }

        let tasa;
        if (numeroCuotas <= 2) {
            tasa = 0;
        } else if (numeroCuotas <= 6) {
            tasa = 0.019;
        } else {
            tasa = 0.023;
        }

        let cuota;
        if (tasa === 0) {
            cuota = monto / numeroCuotas;
        } else {
            cuota = (monto * tasa) / (1 - Math.pow(1 + tasa, -numeroCuotas));
        }

        this.#deuda += monto;
        this.registrarMovimiento(`Compra a ${numeroCuotas} cuotas`, monto);

        return Number(cuota.toFixed(2));
    }
}
