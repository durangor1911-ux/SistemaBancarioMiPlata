// Servicio de Transferencias - Sistema Bancario Mi Plata
// Reglas (según los requisitos del proyecto):
//  - Se permite transferir entre productos DISTINTOS del mismo cliente
//    (ej. de Ahorros a Corriente).
//  - Se permite transferir a cuentas de OTROS clientes, sin importar el tipo.
//  - NO se permite transferir entre dos cuentas del MISMO TIPO del MISMO cliente
//    (ej. de Ahorros a Ahorros propia).

import { buscarPorNumero, listarCuentasPorCliente } from '../repository/cuentaRepository.js';

export function transferir(cedulaCliente, numeroCuentaOrigen, numeroCuentaDestino, monto) {

    if (numeroCuentaOrigen === numeroCuentaDestino) {
        throw new Error("No se puede transferir a la misma cuenta");
    }

    const origen = buscarPorNumero(numeroCuentaOrigen);
    const destino = buscarPorNumero(numeroCuentaDestino);

    // Verificar si ambas cuentas pertenecen al cliente que está transfiriendo
    const cuentasDelCliente = listarCuentasPorCliente(cedulaCliente);
    const origenEsDelCliente = cuentasDelCliente.some(c => c.numeroCuenta === numeroCuentaOrigen);
    const destinoEsDelCliente = cuentasDelCliente.some(c => c.numeroCuenta === numeroCuentaDestino);

    if (origenEsDelCliente && destinoEsDelCliente) {
        const mismoTipoDeProducto = origen.constructor.name === destino.constructor.name;
        if (mismoTipoDeProducto) {
            throw new Error(
                "No se permite transferir entre dos cuentas del mismo tipo de producto del mismo cliente"
            );
        }
    }

    // retirar() ya valida saldo/sobregiro/interés según el tipo de cuenta origen
    origen.retirar(monto);
    destino.consignar(monto);

    return {
        origen: origen.numeroCuenta,
        destino: destino.numeroCuenta,
        monto
    };
}
