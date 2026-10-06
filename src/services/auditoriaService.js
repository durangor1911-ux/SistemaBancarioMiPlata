// Servicio de Auditoría - Sistema Bancario Mi Plata
// Lleva un historial (en memoria) de los eventos de seguridad: logins
// exitosos y fallidos, bloqueos, desbloqueos y cierres de sesión.
// Sirve para revisar después quién intentó entrar y cuándo.
// Regla: NUNCA se registran contraseñas en la auditoría.

export const EVENTOS = Object.freeze({
    LOGIN_EXITOSO: "LOGIN_EXITOSO",
    LOGIN_FALLIDO: "LOGIN_FALLIDO",
    INTENTO_CUENTA_BLOQUEADA: "INTENTO_CUENTA_BLOQUEADA",
    BLOQUEO: "BLOQUEO",
    DESBLOQUEO: "DESBLOQUEO",
    LOGOUT: "LOGOUT"
});

const historial = [];

/**
 * Agrega un evento al historial.
 * "detalle" es opcional: información extra útil para quien revise la auditoría.
 */
export function registrarEvento(evento, usuario, detalle = "") {
    // Cada registro se congela para que nadie pueda alterarlo después
    historial.push(Object.freeze({
        fecha: new Date(),
        evento,
        usuario,
        detalle
    }));
}

/**
 * Retorna una copia del historial completo (en orden de ocurrencia).
 */
export function listarHistorial() {
    return [...historial];
}
