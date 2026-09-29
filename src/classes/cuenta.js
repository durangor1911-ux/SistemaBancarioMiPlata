// Clase Cuenta - Sistema Bancario Mi Plata
// Clase BASE de la que heredan CuentaAhorros, CuentaCorriente y TarjetaCredito.
//
// Nota: los atributos usan "_" (un guion bajo) en vez de "#" a propósito.
// En JavaScript, los campos con "#" son privados de verdad: ni siquiera las
// clases hijas pueden acceder a ellos. Como CuentaAhorros y CuentaCorriente
// SÍ necesitan modificar _saldo al sobrescribir retirar(), usamos la
// convención "_" (protegido por convención, no por el lenguaje).

export default class Cuenta {

    _numeroCuenta;
    _saldo;
    _movimientos;

    constructor(numeroCuenta, saldoInicial = 0) {
        this._numeroCuenta = numeroCuenta;
        this._saldo = saldoInicial;
        this._movimientos = [];
    }

    // ===== Getters =====
    get numeroCuenta() { return this._numeroCuenta; }
    get saldo() { return this._saldo; }
    get movimientos() { return [...this._movimientos]; } // copia, no la referencia real

    // ===== Operaciones bancarias =====

    consultarSaldo() {
        return this._saldo;
    }

    consignar(monto) {
        if (monto <= 0) {
            throw new Error("El monto a consignar debe ser mayor a cero");
        }
        this._saldo += monto;
        this.registrarMovimiento("Consignación", monto);
        return this._saldo;
    }

    /**
     * Retiro "base". Las subclases SOBRESCRIBEN este método para aplicar
     * sus propias reglas (interés en Ahorros, sobregiro en Corriente).
     * Esto es el polimorfismo que pide el proyecto.
     */
    retirar(monto) {
        if (monto <= 0) {
            throw new Error("El monto a retirar debe ser mayor a cero");
        }
        if (monto > this._saldo) {
            throw new Error("Saldo insuficiente para realizar el retiro");
        }
        this._saldo -= monto;
        this.registrarMovimiento("Retiro", monto);
        return this._saldo;
    }

    registrarMovimiento(tipo, valor) {
        this._movimientos.push({
            fecha: new Date(),
            tipo,
            valor
        });
    }

    // ===== CRUD (persistencia) =====
    // Esqueleto para conectar más adelante con el módulo de Transacciones/almacenamiento.

    create() {
        // pendiente: guardar la cuenta en el almacenamiento (BD, localStorage, etc.)
    }

    selectAll() {
        // pendiente: retornar todas las cuentas almacenadas
    }

    update(id) {
        // pendiente: actualizar una cuenta existente por id
    }

    selectById(id) {
        // pendiente: buscar una cuenta específica por id
    }
}
