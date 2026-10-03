// Repositorio de Cuentas - Sistema Bancario Mi Plata
// Almacenamiento en memoria (un array). Guarda y busca cuentas,
// asociándolas con la cédula del cliente dueño, sin modificar
// las clases de dominio (CuentaAhorros, CuentaCorriente, TarjetaCredito).

const cuentas = []; // cada elemento: { cedulaCliente, cuenta }

/**
 * Guarda una cuenta nueva, asociada a la cédula de su dueño.
 */
export function guardarCuenta(cedulaCliente, cuenta) {
    cuentas.push({ cedulaCliente, cuenta });
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

/**
 * Retorna todas las cuentas registradas (útil para reportes/admin).
 */
export function listarTodas() {
    return cuentas.map(r => r.cuenta);
}
