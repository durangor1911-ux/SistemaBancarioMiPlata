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
