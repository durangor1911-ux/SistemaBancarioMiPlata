// main.js - Pruebas de las clases de dominio (Cliente, Cuenta y sus hijas)
// Corre con: node src/main.js

import Cliente from './classes/cliente.js';
import CuentaAhorros from './classes/cuentaAhorros.js';
import CuentaCorriente from './classes/cuentaCorriente.js';
import TarjetaCredito from './classes/tarjetaCredito.js';

console.log("===== PRUEBA: Cliente =====");

const cliente1 = Cliente.registrar("123456", "Ana Torres", "3001234567", "ana123", "clave123", "clave123");
console.log(cliente1.mostrarDatos());
console.log("Login correcto:", cliente1.login("clave123"));
console.log("Login incorrecto:", cliente1.login("otraClave"));

try {
    Cliente.registrar("789", "Luis Pérez", "3009999999", "luis99", "clave1", "clave2");
} catch (error) {
    console.log("Error esperado (password no coincide):", error.message);
}

console.log("\n===== PRUEBA: CuentaAhorros =====");

const ahorros = new CuentaAhorros("AH-001", 1000000);
console.log("Saldo inicial:", ahorros.saldo);
ahorros.retirar(100000);
console.log("Saldo tras retirar 100.000 (con 1.5% interés):", ahorros.saldo);

try {
    ahorros.retirar(99999999);
} catch (error) {
    console.log("Error esperado (saldo insuficiente):", error.message);
}

console.log("\n===== PRUEBA: CuentaCorriente =====");

const corriente = new CuentaCorriente("CC-001", 1000000);
console.log("Saldo inicial:", corriente.saldo);
corriente.retirar(1150000); // válido: dentro del 20% de sobregiro
console.log("Saldo tras retirar 1.150.000 (con sobregiro):", corriente.saldo);

try {
    corriente.retirar(5000000); // excede el límite con sobregiro
} catch (error) {
    console.log("Error esperado (supera el sobregiro):", error.message);
}

console.log("\n===== PRUEBA: TarjetaCredito =====");

const tarjeta = new TarjetaCredito("TC-001", 2000000);
console.log("Cuota a 2 cuotas (0% interés):", tarjeta.calcularCuota(600000, 2));
console.log("Cuota a 6 cuotas (1.9% interés):", tarjeta.calcularCuota(400000, 6));
console.log("Deuda acumulada:", tarjeta.deuda);

try {
    tarjeta.retirar(50000);
} catch (error) {
    console.log("Error esperado (tarjeta no soporta retiros):", error.message);
}

console.log("\n===== FIN DE PRUEBAS =====");

// Al inicio de main.js, agrega esta importación:
import { consultarSaldo, consignar, retirar as retirarTransaccion, obtenerHistorial, transferir } from  ' ./transacciones.js' ;

// ... (dejas las pruebas que ya tenía Paola) ...

console.log("\n===== PRUEBA: Módulo de Transacciones (Gabriela) =====");

// 1. Probando Consultar Saldo y Consignar
console.log("Saldo actual ahorros:", consultarSaldo(ahorros));
consignar(ahorros, 500000);
console.log("Saldo ahorros tras consignar $500.000:", consultarSaldo(ahorros));

// 2. Probando Transferencias
try {
    transferir(ahorros, corriente, 200000);
    console.log("Transferencia de Ahorros -> Corriente realizada con éxito");
    console.log("Nuevo saldo Ahorros:", consultarSaldo(ahorros));
    console.log("Nuevo saldo Corriente:", consultarSaldo(corriente));
} catch (error) {
    console.log("Error en transferencia:", error.message);
}

// 3. Probando Historial de Movimientos
console.log("\nHistorial de movimientos de Ahorros (AH-001):");
console.table(obtenerHistorial("AH-001"));

console.log("\n===== FIN DE TODAS LAS PRUEBAS =====");