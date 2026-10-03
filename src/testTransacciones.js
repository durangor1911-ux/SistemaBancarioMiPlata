// testTransacciones.js - Pruebas del módulo de Transacciones (Gabriela)
// Corre con: node src/testTransacciones.js

import CuentaAhorros from './classes/cuentaAhorros.js';
import CuentaCorriente from './classes/cuentaCorriente.js';
import { guardarCuenta } from './repository/cuentaRepository.js';
import { consultarSaldo, consignar, retirar } from './services/transaccionesService.js';
import { transferir } from './services/transferenciaService.js';
import { obtenerMovimientos } from './services/movimientosService.js';

// Datos de prueba: una cliente con dos cuentas de tipos distintos
const cedulaCliente = "123456";

const ahorros = new CuentaAhorros("AH-001", 1000000);
const corriente = new CuentaCorriente("CC-001", 500000);

guardarCuenta(cedulaCliente, ahorros);
guardarCuenta(cedulaCliente, corriente);

console.log("===== Consultar saldo =====");
console.log("Saldo Ahorros:", consultarSaldo("AH-001"));
console.log("Saldo Corriente:", consultarSaldo("CC-001"));

console.log("\n===== Consignar =====");
consignar("CC-001", 200000);
console.log("Saldo Corriente tras consignar:", consultarSaldo("CC-001"));

console.log("\n===== Retirar =====");
retirar("AH-001", 100000); // aplica el 1.5% de interés automáticamente
console.log("Saldo Ahorros tras retirar:", consultarSaldo("AH-001"));

console.log("\n===== Transferencia válida (tipos distintos, mismo cliente) =====");
const resultado = transferir(cedulaCliente, "AH-001", "CC-001", 50000);
console.log("Transferencia realizada:", resultado);

console.log("\n===== Transferencia inválida (mismo tipo, mismo cliente) =====");
const ahorros2 = new CuentaAhorros("AH-002", 300000);
guardarCuenta(cedulaCliente, ahorros2);
try {
    transferir(cedulaCliente, "AH-001", "AH-002", 10000);
} catch (error) {
    console.log("Error esperado:", error.message);
}

console.log("\n===== Historial de movimientos (Ahorros) =====");
console.log(obtenerMovimientos("AH-001"));

console.log("\n===== FIN DE PRUEBAS =====");
