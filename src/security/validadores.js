// Validadores - Sistema Bancario Mi Plata
// Funciones que revisan el formato de los datos antes de registrar un cliente.
// Cada función retorna true si el dato es válido, o lanza un Error con un
// mensaje claro si no lo es (igual que hacen las clases de Cuenta).
//
// Se usan "expresiones regulares" (regex) para describir el formato esperado:
//   ^      -> inicio del texto
//   $      -> fin del texto
//   \d     -> un dígito (0-9)
//   {a,b}  -> entre a y b repeticiones

/**
 * Cédula: solo números, entre 6 y 10 dígitos.
 */
export function validarCedula(cedula) {
    const formatoCedula = /^\d{6,10}$/;
    if (!formatoCedula.test(String(cedula))) {
        throw new Error("La cédula debe contener solo números, entre 6 y 10 dígitos");
    }
    return true;
}

/**
 * Usuario: entre 4 y 20 caracteres, solo letras (sin tildes ni ñ) y números.
 */
export function validarUsuario(usuario) {
    const formatoUsuario = /^[a-zA-Z0-9]{4,20}$/;
    if (!formatoUsuario.test(String(usuario))) {
        throw new Error("El usuario debe tener entre 4 y 20 caracteres, solo letras y números");
    }
    return true;
}

/**
 * Contraseña: mínimo 8 caracteres, con al menos una mayúscula,
 * una minúscula y un número.
 * Importante: los mensajes de error NUNCA incluyen la contraseña.
 */
export function validarPassword(password) {
    if (typeof password !== "string" || password.length < 8) {
        throw new Error("La contraseña debe tener mínimo 8 caracteres");
    }
    if (!/[A-Z]/.test(password)) {
        throw new Error("La contraseña debe tener al menos una letra mayúscula");
    }
    if (!/[a-z]/.test(password)) {
        throw new Error("La contraseña debe tener al menos una letra minúscula");
    }
    if (!/\d/.test(password)) {
        throw new Error("La contraseña debe tener al menos un número");
    }
    return true;
}
