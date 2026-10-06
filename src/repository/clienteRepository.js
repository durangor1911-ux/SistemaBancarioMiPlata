// Repositorio de Clientes - Sistema Bancario Mi Plata
// Almacenamiento local persistente en data/clientes.json y caché en memoria.
// Las contraseñas se guardan solo como hash, nunca en texto plano.
//
// Diferencia con cuentaRepository: aquí las búsquedas retornan null si no
// encuentran nada, en vez de lanzar un error. Así el login puede responder
// siempre "Credenciales inválidas" sin revelar si el usuario existe.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Cliente from '../classes/cliente.js';

const directorioRepositorio = path.dirname(fileURLToPath(import.meta.url));
const rutaArchivo = process.env.CLIENTES_DB_PATH
    ? path.resolve(process.env.CLIENTES_DB_PATH)
    : path.resolve(directorioRepositorio, '../../data/clientes.json');

function cargarClientes() {
    try {
        const contenido = fs.readFileSync(rutaArchivo, 'utf8');
        const datos = JSON.parse(contenido);
        if (!Array.isArray(datos)) {
            throw new Error('El archivo local de clientes debe contener una lista JSON');
        }
        return new Map(datos.map(datosCliente => {
            if (!datosCliente?.cedula || !datosCliente.passwordHash) {
                throw new Error('El archivo local contiene un cliente incompleto');
            }
            const cliente = Cliente.desdePersistencia(datosCliente);
            return [cliente.cedula, cliente];
        }));
    } catch (error) {
        if (error.code === 'ENOENT') {
            return new Map();
        }
        throw error;
    }
}

const clientes = cargarClientes(); // llave: cédula, valor: objeto Cliente

function guardarEnDisco() {
    fs.mkdirSync(path.dirname(rutaArchivo), { recursive: true });
    const temporal = `${rutaArchivo}.tmp`;
    const contenido = JSON.stringify(
        Array.from(clientes.values(), cliente => cliente.exportarPersistencia()),
        null,
        2
    );
    fs.writeFileSync(temporal, contenido, { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(temporal, rutaArchivo);
}

/**
 * Guarda un cliente usando su cédula como llave.
 * Si ya existía un cliente con esa cédula, se reemplaza.
 */
export function guardar(cliente) {
    clientes.set(cliente.cedula, cliente);
    guardarEnDisco();
    return cliente;
}

/**
 * Devuelve todos los clientes registrados en formato plano (serializable).
 * Útil para mostrarlos en consola, en APIs o en la UI.
 */
export function listarClientes() {
    return Array.from(clientes.values()).map(cliente => ({
        cedula: cliente.cedula,
        nombreCompleto: cliente.nombreCompleto,
        celular: cliente.celular,
        usuario: cliente.usuario,
        rol: cliente.rol,
        bloqueado: cliente.bloqueado,
        intentosFallidos: cliente.intentosFallidos,
    }));
}

/**
 * Elimina un cliente por cédula.
 * Retorna el cliente eliminado o null si no existía.
 */
export function eliminarCliente(cedula) {
    const cliente = clientes.get(cedula) ?? null;
    if (!cliente) {
        return null;
    }
    clientes.delete(cedula);
    guardarEnDisco();
    return cliente;
}

/**
 * Elimina un cliente por nombre de usuario.
 */
export function eliminarPorUsuario(usuario) {
    const cliente = buscarPorUsuario(usuario);
    if (!cliente) {
        return null;
    }
    clientes.delete(cliente.cedula);
    guardarEnDisco();
    return cliente;
}

/** Persiste los cambios hechos a un cliente ya guardado. */
export function persistirCambios() {
    guardarEnDisco();
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
