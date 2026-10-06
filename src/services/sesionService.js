// Servicio de Sesiones - Sistema Bancario Mi Plata
// Crea, valida y cierra las sesiones de los clientes.
// Las sesiones activas se guardan en memoria en un Map (token -> Sesion).

import Sesion from '../classes/sesion.js';

const sesiones = new Map();

/**
 * Crea una sesión nueva para el cliente y la guarda.
 */
export function crearSesion(cedulaCliente) {
    const sesion = new Sesion(cedulaCliente);
    sesiones.set(sesion.token, sesion);
    return sesion;
}

/**
 * Retorna la Sesion si el token existe y no ha expirado; si no, retorna null.
 * Si la sesión ya expiró, se elimina para que no se pueda volver a usar.
 * fechaActual es opcional y sirve para simular el paso del tiempo en pruebas.
 */
export function validarToken(token, fechaActual = new Date()) {
    const sesion = sesiones.get(token);
    if (!sesion) {
        return null;
    }
    if (!sesion.estaActiva(fechaActual)) {
        sesiones.delete(token);
        return null;
    }
    return sesion;
}

/**
 * Cierra (elimina) la sesión. Retorna true si existía, false si no.
 */
export function cerrarSesion(token) {
    return sesiones.delete(token);
}
