import TarjetaCredito from './classes/tarjetaCredito.js';

const tarjeta = new TarjetaCredito(12345, 1000000);

console.log("Cupo:", tarjeta.cupo);
console.log("Deuda:", tarjeta.deuda);
console.log("Cupo disponible:", tarjeta.cupoDisponible);

console.log("¿TarjetaCredito es una Cuenta?");
console.log(tarjeta instanceof TarjetaCredito);
console.log(tarjeta instanceof Cuenta);