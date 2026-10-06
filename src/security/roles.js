// Roles y Permisos - Sistema Bancario Mi Plata
// Define QUIÉN es cada usuario (rol) y QUÉ puede hacer (permisos).
//
// Object.freeze() "congela" el objeto: nadie puede agregar, cambiar ni
// borrar roles o permisos mientras el programa está corriendo.

export const ROLES = Object.freeze({
    CLIENTE: "CLIENTE",
    ADMIN: "ADMIN"
});

// Nombres de las acciones que se pueden controlar.
// Usar estas constantes (en vez de escribir el texto a mano) evita errores
// de tipeo: ACCIONES.TRANSFERIR siempre vale lo mismo en todo el proyecto.
export const ACCIONES = Object.freeze({
    CONSULTAR_SALDO: "CONSULTAR_SALDO",
    CONSIGNAR: "CONSIGNAR",
    RETIRAR: "RETIRAR",
    TRANSFERIR: "TRANSFERIR",
    VER_MOVIMIENTOS: "VER_MOVIMIENTOS",
    BLOQUEAR_CLIENTE: "BLOQUEAR_CLIENTE",
    DESBLOQUEAR_CLIENTE: "DESBLOQUEAR_CLIENTE",
    VER_AUDITORIA: "VER_AUDITORIA",
    VER_CLIENTES: "VER_CLIENTES",
    ELIMINAR_CLIENTE: "ELIMINAR_CLIENTE"
});

// Lo que puede hacer un cliente normal con sus propias cuentas
const PERMISOS_CLIENTE = [
    ACCIONES.CONSULTAR_SALDO,
    ACCIONES.CONSIGNAR,
    ACCIONES.RETIRAR,
    ACCIONES.TRANSFERIR,
    ACCIONES.VER_MOVIMIENTOS
];

// Permisos por rol.
// [ROLES.CLIENTE] usa el VALOR de la constante como nombre de la propiedad,
// así las llaves siempre coinciden con los roles definidos arriba.
export const PERMISOS = Object.freeze({
    [ROLES.CLIENTE]: Object.freeze([...PERMISOS_CLIENTE]),

    // El ADMIN puede todo lo del cliente ("..." copia esa lista) y además:
    [ROLES.ADMIN]: Object.freeze([
        ...PERMISOS_CLIENTE,
        ACCIONES.BLOQUEAR_CLIENTE,
        ACCIONES.DESBLOQUEAR_CLIENTE,
        ACCIONES.VER_AUDITORIA,
        ACCIONES.VER_CLIENTES,
        ACCIONES.ELIMINAR_CLIENTE
    ])
});
