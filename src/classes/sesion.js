// Clase Sesion - Sistema Bancario Mi Plata
// Representa una sesión iniciada por un cliente después de hacer login.
// El "token" es como un pase temporal: mientras la sesión esté activa,
// el cliente lo usa para identificarse sin volver a escribir su contraseña.

import { randomUUID } from 'node:crypto';

const DURACION_MINUTOS = 30;

export default class Sesion {

    #token;
    #cedulaCliente;
    #fechaCreacion;
    #fechaExpiracion;

    constructor(cedulaCliente) {
        // randomUUID genera un identificador aleatorio imposible de adivinar,
        // por ejemplo: "3b241101-e2bb-4255-8caf-4136c566a962"
        this.#token = randomUUID();
        this.#cedulaCliente = cedulaCliente;
        this.#fechaCreacion = new Date();
        // getTime() da la fecha en milisegundos; sumamos 30 minutos en milisegundos
        this.#fechaExpiracion = new Date(this.#fechaCreacion.getTime() + DURACION_MINUTOS * 60 * 1000);
    }

    // ===== Getters =====
    get token() { return this.#token; }
    get cedulaCliente() { return this.#cedulaCliente; }
    // Se retornan copias de las fechas para que nadie pueda modificar las originales
    get fechaCreacion() { return new Date(this.#fechaCreacion); }
    get fechaExpiracion() { return new Date(this.#fechaExpiracion); }

    /**
     * Indica si la sesión sigue vigente.
     * El parámetro fechaActual permite simular el paso del tiempo en las pruebas;
     * si no se envía, se usa la fecha y hora de este momento.
     */
    estaActiva(fechaActual = new Date()) {
        return fechaActual < this.#fechaExpiracion;
    }
}
