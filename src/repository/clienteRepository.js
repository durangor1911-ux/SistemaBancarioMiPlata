// Repositorio de Clientes - Sistema Bancario Mi Plata
// Almacenamiento en memoria usando un Map (cédula -> Cliente).
// Un Map es como un diccionario: guarda pares llave-valor y permite
// buscar por la llave muy rápido.
//
// Diferencia con cuentaRepository: aquí las búsquedas retornan null si no
// encuentran nada, en vez de lanzar un error. Así el login puede responder
// siempre "Credenciales inválidas" sin revelar si el usuario existe.

const clientes = new Map(); // llave: cédula, valor: objeto Cliente

/**
 * Guarda un cliente usando su cédula como llave.
 * Si ya existía un cliente con esa cédula, se reemplaza.
 */
export function guardar(cliente) {
    clientes.set(cliente.cedula, cliente);
    return cliente;
}

/**
 * Busca un cliente por su nombre de usuario (sin importar mayúsculas/minúsculas).
 * Retorna el Cliente, o null si no existe.
 */
export function buscarPorUsuario(usuario) {
    const usuarioBuscado = String(usuario).toLowerCase();
    for (const cliente of clientes.values()) {
        if (cliente.usuario.toLowerCase() === usuarioBuscado) {
            return cliente;
        }
    }
    return null;
}

/**
 * Busca un cliente por su cédula. Retorna el Cliente, o null si no existe.
 */
export function buscarPorCedula(cedula) {
    return clientes.get(cedula) ?? null; // "??" usa null si el resultado es undefined
}

/**
 * Indica si ya existe un cliente con ese nombre de usuario.
 */
export function existeUsuario(usuario) {
    return buscarPorUsuario(usuario) !== null;
}
