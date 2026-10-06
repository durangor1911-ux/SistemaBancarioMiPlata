// Servicio de Autorización - Sistema Bancario Mi Plata
// Autenticación = comprobar QUIÉN eres (login).
// Autorización  = comprobar QUÉ puedes hacer (este archivo).

import { validarToken } from './sesionService.js';
import { buscarPorCedula } from '../repository/clienteRepository.js';
import { PERMISOS } from '../security/roles.js';

/**
 * Retorna el Cliente dueño de una sesión activa, o null si el token no es válido.
 */
export function obtenerClienteDeSesion(token) {
    const sesion = validarToken(token);
    if (!sesion) {
        return null;
    }
    return buscarPorCedula(sesion.cedulaCliente);
}

/**
 * Indica si el dueño del token puede realizar la acción "permiso".
 * Ejemplo: tienePermiso(token, ACCIONES.TRANSFERIR)
 */
export function tienePermiso(token, permiso) {
    const cliente = obtenerClienteDeSesion(token);

    // Sin sesión válida, o con la cuenta bloqueada, no se tiene ningún permiso
    if (!cliente || cliente.bloqueado) {
        return false;
    }

    // El rol se consulta en el cliente (no se copia en la sesión), así que
    // si un ADMIN cambia o bloquea a alguien, el cambio aplica de inmediato.
    const permisosDelRol = PERMISOS[cliente.rol] || [];
    return permisosDelRol.includes(permiso);
}
