// Servicio de Autenticación - Sistema Bancario Mi Plata
// Registro de clientes, inicio de sesión (login) y cierre de sesión (logout).
// También incluye las acciones de ADMIN para bloquear y desbloquear clientes.

import { randomUUID } from 'node:crypto';
import Cliente from '../classes/cliente.js';
import { validarCedula, validarUsuario, validarPassword } from '../security/validadores.js';
import { hashear, verificar } from '../security/passwordHasher.js';
import { ROLES, ACCIONES } from '../security/roles.js';
import { guardar, buscarPorUsuario, buscarPorCedula, existeUsuario, persistirCambios } from '../repository/clienteRepository.js';
import { crearSesion, validarToken, cerrarSesion } from './sesionService.js';
import { tienePermiso, obtenerClienteDeSesion } from './autorizacionService.js';
import { registrarEvento, EVENTOS } from './auditoriaService.js';

// Se usa el MISMO mensaje para todos los errores de login. Así un atacante no
// puede saber si el usuario existe, si falló la contraseña o si está bloqueado.
const MENSAJE_CREDENCIALES_INVALIDAS = "Credenciales inválidas";

// Hash de un valor aleatorio que nadie conoce. Se usa en login() cuando el
// usuario no existe, para que la respuesta tarde lo mismo (ver más abajo).
const HASH_FALSO = hashear(randomUUID());

// ===== Registro =====

/**
 * Lógica común para validar, crear y guardar un cliente con un rol.
 * No se exporta: solo se usa dentro de este archivo.
 */
function crearYGuardarCliente(datos, rol) {
    const { cedula, nombreCompleto, celular, usuario, password, confirmarPassword } = datos;

    // 1. Validar el formato (cada función lanza un Error si algo está mal)
    validarCedula(cedula);
    validarUsuario(usuario);
    validarPassword(password);

    // 2. Evitar duplicados
    if (buscarPorCedula(cedula) !== null) {
        throw new Error("Ya existe un cliente registrado con esa cédula");
    }
    if (existeUsuario(usuario)) {
        throw new Error("El nombre de usuario ya está en uso");
    }

    // 3. Crear el cliente: Cliente.registrar() revisa campos obligatorios y la
    //    confirmación, y el constructor convierte la contraseña en hash.
    const cliente = Cliente.registrar(cedula, nombreCompleto, celular, usuario, password, confirmarPassword, rol);

    // 4. Guardar en el repositorio
    return guardar(cliente);
}

/**
 * Registra un cliente nuevo.
 * datos = { cedula, nombreCompleto, celular, usuario, password, confirmarPassword }
 *
 * El rol SIEMPRE es CLIENTE: si "datos" trae un campo rol, se ignora.
 * Si el usuario pudiera elegir su rol, cualquiera podría registrarse como ADMIN.
 */
export function registrar(datos = {}) {
    return crearYGuardarCliente(datos, ROLES.CLIENTE);
}

/**
 * Crea un usuario ADMIN. Solo para uso interno del sistema (por ejemplo,
 * al iniciar la aplicación). Nunca debe ofrecerse en un formulario público.
 */
export function crearAdministrador(datos = {}) {
    return crearYGuardarCliente(datos, ROLES.ADMIN);
}

// ===== Login y Logout =====

/**
 * Inicia sesión. Si las credenciales son correctas, retorna el token de la sesión.
 * Si algo falla, lanza un Error con el mensaje genérico "Credenciales inválidas".
 */
export function login(usuario, password) {
    const cliente = buscarPorUsuario(usuario);

    // Siempre se ejecuta scrypt (con el hash real o con uno falso). Así la
    // respuesta tarda lo mismo exista o no el usuario, y nadie puede
    // descubrir usuarios midiendo cuánto se demora el sistema en responder.
    let passwordCorrecta = false;
    if (cliente) {
        passwordCorrecta = cliente.verificarPassword(password);
    } else {
        verificar(password, HASH_FALSO); // el resultado no importa: solo iguala el tiempo
    }

    if (!cliente) {
        registrarEvento(EVENTOS.LOGIN_FALLIDO, usuario, "El usuario no existe");
        throw new Error(MENSAJE_CREDENCIALES_INVALIDAS);
    }

    if (cliente.bloqueado) {
        registrarEvento(EVENTOS.INTENTO_CUENTA_BLOQUEADA, cliente.usuario, "Intento de ingreso con la cuenta bloqueada");
        throw new Error(MENSAJE_CREDENCIALES_INVALIDAS);
    }

    if (!passwordCorrecta) {
        const quedoBloqueado = cliente.registrarIntentoFallido();
        persistirCambios();
        registrarEvento(EVENTOS.LOGIN_FALLIDO, cliente.usuario, `Contraseña incorrecta (intento ${cliente.intentosFallidos})`);
        if (quedoBloqueado) {
            registrarEvento(EVENTOS.BLOQUEO, cliente.usuario, `Bloqueado tras ${cliente.intentosFallidos} intentos fallidos`);
        }
        throw new Error(MENSAJE_CREDENCIALES_INVALIDAS);
    }

    // Todo correcto: se reinician los intentos y se crea la sesión
    cliente.reiniciarIntentos();
    persistirCambios();
    const sesion = crearSesion(cliente.cedula);
    registrarEvento(EVENTOS.LOGIN_EXITOSO, cliente.usuario);
    return sesion.token;
}

/**
 * Cierra la sesión del token. Retorna true si se cerró, false si el token
 * no existía o ya había expirado (en ese caso no hay nada que cerrar).
 */
export function logout(token) {
    const sesion = validarToken(token);
    if (!sesion) {
        return false;
    }
    const cliente = buscarPorCedula(sesion.cedulaCliente);
    cerrarSesion(token);
    registrarEvento(EVENTOS.LOGOUT, cliente.usuario);
    return true;
}

// ===== Acciones de ADMIN =====

/**
 * Revisa que el token tenga el permiso indicado y que el cliente exista.
 * Retorna el admin que hace la acción y el cliente afectado.
 */
function prepararAccionDeAdmin(tokenAdmin, cedula, permiso) {
    if (!tienePermiso(tokenAdmin, permiso)) {
        throw new Error("Acceso denegado: no tiene permiso para realizar esta acción");
    }
    const cliente = buscarPorCedula(cedula);
    if (!cliente) {
        throw new Error("No existe un cliente con esa cédula");
    }
    const admin = obtenerClienteDeSesion(tokenAdmin);
    return { admin, cliente };
}

/**
 * Un ADMIN bloquea a un cliente manualmente.
 */
export function bloquearCliente(tokenAdmin, cedula) {
    const { admin, cliente } = prepararAccionDeAdmin(tokenAdmin, cedula, ACCIONES.BLOQUEAR_CLIENTE);
    cliente.bloquear();
    persistirCambios();
    registrarEvento(EVENTOS.BLOQUEO, cliente.usuario, `Bloqueado por el administrador ${admin.usuario}`);
}

/**
 * Un ADMIN desbloquea a un cliente (y se reinician sus intentos fallidos).
 */
export function desbloquearCliente(tokenAdmin, cedula) {
    const { admin, cliente } = prepararAccionDeAdmin(tokenAdmin, cedula, ACCIONES.DESBLOQUEAR_CLIENTE);
    cliente.desbloquear();
    persistirCambios();
    registrarEvento(EVENTOS.DESBLOQUEO, cliente.usuario, `Desbloqueado por el administrador ${admin.usuario}`);
}
