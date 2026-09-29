// Clase Cliente - Sistema Bancario Mi Plata
// Representa a un cliente del banco, con sus datos personales y credenciales.

export default class Cliente {

    // Atributos privados (encapsulamiento)
    #cedula;
    #nombreCompleto;
    #celular;
    #usuario;
    #password;

    constructor(cedula, nombreCompleto, celular, usuario, password) {
        this.#cedula = cedula;
        this.#nombreCompleto = nombreCompleto;
        this.#celular = celular;
        this.#usuario = usuario;
        this.#password = password;
    }

    // ===== Getters =====
    get cedula() { return this.#cedula; }
    get nombreCompleto() { return this.#nombreCompleto; }
    get celular() { return this.#celular; }
    get usuario() { return this.#usuario; }
    // Nota: no se expone un getter público para "password" por seguridad.
    // Si algo necesita validarla, se usa el método login(), no un acceso directo.

    // ===== Setters =====
    set nombreCompleto(valor) { this.#nombreCompleto = valor; }
    set celular(valor) { this.#celular = valor; }

    // ===== Métodos de negocio (coinciden con el diagrama UML) =====

    /**
     * Crea un nuevo Cliente validando que la contraseña y su confirmación coincidan.
     * Corresponde a +register(): void del diagrama.
     */
    static registrar(cedula, nombreCompleto, celular, usuario, password, confirmarPassword) {
        if (!cedula || !nombreCompleto || !celular || !usuario || !password) {
            throw new Error("Todos los campos son obligatorios");
        }
        if (password !== confirmarPassword) {
            throw new Error("La contraseña y su confirmación no coinciden");
        }
        return new Cliente(cedula, nombreCompleto, celular, usuario, password);
    }

    /**
     * Valida si la contraseña ingresada coincide con la del cliente.
     * Corresponde a +login(): boolean del diagrama.
     */
    login(passwordIngresada) {
        return passwordIngresada === this.#password;
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
        if (passwordActual !== this.#password) {
            throw new Error("La contraseña actual no coincide");
        }
        if (passwordNueva !== confirmarPasswordNueva) {
            throw new Error("La nueva contraseña y su confirmación no coinciden");
        }
        this.#password = passwordNueva;
        return true;
    }

    mostrarDatos() {
        return `Cliente: ${this.#nombreCompleto} | Usuario: ${this.#usuario} | Celular: ${this.#celular}`;
    }
}
