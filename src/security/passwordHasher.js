// Password Hasher - Sistema Bancario Mi Plata
// Convierte contraseñas en un "hash" para NO guardarlas en texto plano.
//
// ¿Qué es un hash? Es el resultado de pasar la contraseña por una función
// matemática de un solo sentido: de "MiClave123" se obtiene algo como
// "a3f9...", pero del hash NO se puede volver a obtener la contraseña.
//
// ¿Qué es el salt? Un valor aleatorio distinto para cada contraseña. Así, si
// dos clientes usan la misma contraseña, sus hashes quedan diferentes.
//
// Se usa SOLO el módulo "crypto" que ya viene con Node (no es librería externa).
// El prefijo "node:" indica justamente que es un módulo interno de Node.

import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

const LONGITUD_SALT = 16; // bytes aleatorios para el salt
const LONGITUD_HASH = 64; // bytes del hash resultante

/**
 * Genera el hash de una contraseña.
 * Retorna un texto con el formato "salt:hash" (ambos en hexadecimal),
 * porque para verificar más adelante se necesita el mismo salt.
 */
export function hashear(password) {
    if (typeof password !== "string" || password.length === 0) {
        throw new Error("La contraseña a hashear debe ser un texto no vacío");
    }

    const salt = randomBytes(LONGITUD_SALT).toString("hex");
    // scrypt es un algoritmo LENTO a propósito: así, adivinar contraseñas
    // probando millones de combinaciones se vuelve muy costoso.
    const hash = scryptSync(password, salt, LONGITUD_HASH).toString("hex");

    return `${salt}:${hash}`;
}

/**
 * Verifica si una contraseña en texto plano corresponde a un hash guardado.
 * Retorna true si coincide, false si no.
 */
export function verificar(password, hashGuardado) {
    if (typeof password !== "string" || typeof hashGuardado !== "string") {
        return false;
    }

    // Separamos el texto guardado en sus dos partes: salt y hash
    const [salt, hashOriginal] = hashGuardado.split(":");
    if (!salt || !hashOriginal) {
        return false; // formato inválido
    }

    // Se repite el proceso con la contraseña ingresada y el MISMO salt
    const bufferOriginal = Buffer.from(hashOriginal, "hex");
    const bufferNuevo = scryptSync(password, salt, LONGITUD_HASH);

    // timingSafeEqual exige que ambos tengan el mismo tamaño
    if (bufferOriginal.length !== bufferNuevo.length) {
        return false;
    }

    // timingSafeEqual compara SIEMPRE todos los bytes y tarda lo mismo
    // sin importar en qué posición esté la diferencia. Con un "===" normal,
    // un atacante podría medir tiempos de respuesta para ir adivinando el hash.
    return timingSafeEqual(bufferOriginal, bufferNuevo);
}
