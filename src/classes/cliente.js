// Clase Cliente - Sistema Bancario Mi Plata
// Representa a un cliente del banco, con sus datos personales y credenciales.
//
// Seguridad: la contraseña NUNCA se guarda en texto plano. Apenas se crea el
// cliente, la contraseña se convierte en un hash (ver security/passwordHasher.js)
// y solo se guarda ese hash.

import { hashear, verificar } from '../security/passwordHasher.js';
import { validarPassword } from '../security/validadores.js';
import { ROLES } from '../security/roles.js';

const MAXIMO_INTENTOS_FALLIDOS = 3; // al llegar a este número, el cliente se bloquea
const TOKEN_PERSISTENCIA = Symbol('restaurar-cliente');

export default class Cliente {

    // Atributos privados (encapsulamiento)
    #cedula;
    #nombreCompleto;
    #celular;
    #usuario;
    #passwordHash;      // solo el hash, nunca la contraseña original
    #rol;
    #intentosFallidos;
    #bloqueado;

    constructor(cedula, nombreCompleto, celular, usuario, password, rol = ROLES.CLIENTE, tokenPersistencia = null) {
        // Object.values(ROLES) da la lista ["CLIENTE", "ADMIN"]
        if (!Object.values(ROLES).includes(rol)) {
            throw new Error("Rol inválido");
        }

        this.#cedula = cedula;
        this.#nombreCompleto = nombreCompleto;
        this.#celular = celular;
        this.#usuario = usuario;
        this.#passwordHash = tokenPersistencia === TOKEN_PERSISTENCIA
            ? password
            : hashear(password); // se guarda el hash, NO la contraseña
        this.#rol = rol;
        this.#intentosFallidos = 0;
        this.#bloqueado = false;
    }

    /**
     * Reconstruye un cliente desde el archivo local sin volver a hashear la
     * contraseña. Solo debe utilizarse para cargar datos del repositorio.
     */
    static desdePersistencia(datos) {
        if (!datos || typeof datos.passwordHash !== 'string' || !datos.passwordHash.includes(':')) {
            throw new Error('Los datos persistidos del cliente no son válidos');
        }
        const cliente = new Cliente(
            datos.cedula,
            datos.nombreCompleto,
            datos.celular,
            datos.usuario,
            datos.passwordHash,
            datos.rol,
            TOKEN_PERSISTENCIA
        );
        cliente.#intentosFallidos = Number(datos.intentosFallidos) || 0;
        cliente.#bloqueado = Boolean(datos.bloqueado);
        return cliente;
    }

    /** Devuelve los datos necesarios para restaurar al cliente desde disco. */
    exportarPersistencia() {
        return {
            cedula: this.#cedula,
            nombreCompleto: this.#nombreCompleto,
            celular: this.#celular,
            usuario: this.#usuario,
            passwordHash: this.#passwordHash,
            rol: this.#rol,
            intentosFallidos: this.#intentosFallidos,
            bloqueado: this.#bloqueado,
        };
    }

    // ===== Getters =====
    get cedula() { return this.#cedula; }
    get nombreCompleto() { return this.#nombreCompleto; }
    get celular() { return this.#celular; }
    get usuario() { return this.#usuario; }
    get rol() { return this.#rol; }
    get intentosFallidos() { return this.#intentosFallidos; }
    get bloqueado() { return this.#bloqueado; }
    // Nota: NO existe getter para el hash de la contraseña, por seguridad.
    // Si algo necesita validarla, se usa verificarPassword(), no un acceso directo.

    // ===== Setters =====
    set nombreCompleto(valor) { this.#nombreCompleto = valor; }
    set celular(valor) { this.#celular = valor; }

    // ===== Métodos de negocio (coinciden con el diagrama UML) =====

    /**
     * Crea un nuevo Cliente validando que la contraseña y su confirmación coincidan.
     * Corresponde a +register(): void del diagrama.
     * Para registrar desde la aplicación se debe usar authService.registrar(),
     * que además valida el formato de los datos y guarda el cliente.
     */
    static registrar(cedula, nombreCompleto, celular, usuario, password, confirmarPassword, rol = ROLES.CLIENTE) {
        if (!cedula || !nombreCompleto || !celular || !usuario || !password) {
            throw new Error("Todos los campos son obligatorios");
        }
        if (password !== confirmarPassword) {
            throw new Error("La contraseña y su confirmación no coinciden");
        }
        return new Cliente(cedula, nombreCompleto, celular, usuario, password, rol);
    }

    /**
     * Compara la contraseña ingresada con el hash guardado.
     * Retorna true si coincide, false si no.
     */
    verificarPassword(passwordPlano) {
        return verificar(passwordPlano, this.#passwordHash);
    }

    /**
     * Valida si la contraseña ingresada es correcta.
     * Corresponde a +login(): boolean del diagrama.
     * El inicio de sesión completo (bloqueos, intentos, token) está en authService.login().
     */
    login(passwordIngresada) {
        return this.verificarPassword(passwordIngresada);
    }

    /**
     * Suma un intento fallido. Al llegar a 3 intentos, el cliente queda bloqueado.
     * Retorna true si el cliente quedó bloqueado.
     */
    registrarIntentoFallido() {
        this.#intentosFallidos++;
        if (this.#intentosFallidos >= MAXIMO_INTENTOS_FALLIDOS) {
            this.#bloqueado = true;
        }
        return this.#bloqueado;
    }

    /**
     * Vuelve el contador de intentos a cero (se usa tras un login exitoso).
     */
    reiniciarIntentos() {
        this.#intentosFallidos = 0;
    }

    /**
     * Bloquea al cliente manualmente (acción de un ADMIN).
     */
    bloquear() {
        this.#bloqueado = true;
    }

    /**
     * Desbloquea al cliente y reinicia sus intentos (acción de un ADMIN).
     */
    desbloquear() {
        this.#bloqueado = false;
        this.#intentosFallidos = 0;
    }

    /**
     * Actualiza los datos editables del perfil.
     * Corresponde a +editProfile(): void del diagrama.
     */
    editarPerfil({ nombreCompleto, celular } = {}) {
        if (nombreCompleto) this.#nombreCompleto = nombreCompleto;
        if (celular) this.#celular = celular;
    }

    /**
     * Cambia la contraseña, validando la actual y la confirmación de la nueva.
     * Corresponde a +changePassword(): void del diagrama.
     */
    cambiarPassword(passwordActual, passwordNueva, confirmarPasswordNueva) {
        if (!this.verificarPassword(passwordActual)) {
            throw new Error("La contraseña actual no coincide");
        }
        if (passwordNueva !== confirmarPasswordNueva) {
            throw new Error("La nueva contraseña y su confirmación no coinciden");
        }
        validarPassword(passwordNueva); // la nueva también debe cumplir las reglas
        this.#passwordHash = hashear(passwordNueva);
        return true;
    }

    mostrarDatos() {
        return `Cliente: ${this.#nombreCompleto} | Usuario: ${this.#usuario} | Celular: ${this.#celular}`;
    }
}
