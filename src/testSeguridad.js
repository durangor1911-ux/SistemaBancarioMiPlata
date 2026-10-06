// testSeguridad.js - Pruebas del módulo de Seguridad, Perfiles y Autenticación
// Corre con: node src/testSeguridad.js
//
// Nota: las contraseñas de este archivo son SOLO datos de prueba.
// Nunca se imprimen en consola ni quedan guardadas en texto plano.

import { registrar, crearAdministrador, login, logout, bloquearCliente, desbloquearCliente } from './services/authService.js';
import { validarToken } from './services/sesionService.js';
import { tienePermiso } from './services/autorizacionService.js';
import { listarHistorial, EVENTOS } from './services/auditoriaService.js';
import { hashear } from './security/passwordHasher.js';
import { ROLES, ACCIONES } from './security/roles.js';

// ===== Ayudas para mostrar los resultados =====

let pruebasOk = 0;
let pruebasFallidas = 0;

// Muestra [OK] si la condición se cumple, o [FALLO] si no
function comprobar(descripcion, condicion) {
    if (condicion) {
        pruebasOk++;
        console.log(`  [OK]    ${descripcion}`);
    } else {
        pruebasFallidas++;
        console.log(`  [FALLO] ${descripcion}`);
    }
}

// Ejecuta "accion" esperando que lance un error. Retorna el mensaje del error.
function esperarError(descripcion, accion) {
    try {
        accion();
        comprobar(`${descripcion} (debía lanzar error y no lo hizo)`, false);
        return null;
    } catch (error) {
        comprobar(`${descripcion} -> "${error.message}"`, true);
        return error.message;
    }
}

// ===== Datos de prueba =====

const PASSWORD_ANA = "MiPlata2026";
const PASSWORD_CARLOS = "Segura123";
const PASSWORD_ADMIN = "AdminBanco1";
const PASSWORD_INCORRECTA = "Incorrecta1";

console.log("===== 1. Registro válido =====");

const ana = registrar({
    cedula: "1020304050",
    nombreCompleto: "Ana Torres",
    celular: "3001234567",
    usuario: "ana123",
    password: PASSWORD_ANA,
    confirmarPassword: PASSWORD_ANA
});
console.log("  " + ana.mostrarDatos());
comprobar("Ana se registró con rol CLIENTE", ana.rol === ROLES.CLIENTE);

const carlos = registrar({
    cedula: "71234567",
    nombreCompleto: "Carlos Ruiz",
    celular: "3109876543",
    usuario: "carlos01",
    password: PASSWORD_CARLOS,
    confirmarPassword: PASSWORD_CARLOS
});
comprobar("Carlos se registró con rol CLIENTE", carlos.rol === ROLES.CLIENTE);

const admin = crearAdministrador({
    cedula: "1000000001",
    nombreCompleto: "Administrador Mi Plata",
    celular: "3000000000",
    usuario: "admin01",
    password: PASSWORD_ADMIN,
    confirmarPassword: PASSWORD_ADMIN
});
comprobar("El administrador se creó con rol ADMIN", admin.rol === ROLES.ADMIN);

const intruso = registrar({
    cedula: "5556667778",
    nombreCompleto: "Intruso",
    celular: "3001112233",
    usuario: "intruso01",
    password: "Intruso123",
    confirmarPassword: "Intruso123",
    rol: ROLES.ADMIN // intenta registrarse como ADMIN
});
comprobar("Si alguien envía rol ADMIN al registrarse, igual queda como CLIENTE", intruso.rol === ROLES.CLIENTE);

console.log("\n===== 2. La contraseña no se guarda en texto plano =====");

comprobar("No hay acceso al hash ni a la contraseña desde afuera", ana.passwordHash === undefined && ana.password === undefined);
comprobar("JSON.stringify(ana) no muestra ningún dato privado", JSON.stringify(ana) === "{}");
comprobar("verificarPassword() con la contraseña correcta retorna true", ana.verificarPassword(PASSWORD_ANA) === true);
comprobar("verificarPassword() con una contraseña incorrecta retorna false", ana.verificarPassword(PASSWORD_INCORRECTA) === false);
comprobar("La misma contraseña genera hashes distintos (gracias al salt)", hashear("Igual1234") !== hashear("Igual1234"));

console.log("\n===== 3. Registro con datos inválidos =====");

// Datos válidos de base; en cada prueba se cambia UN solo campo.
// { ...datosBase, cedula: "X" } copia datosBase y reemplaza solo la cédula.
const datosBase = {
    cedula: "99999999",
    nombreCompleto: "Nuevo Cliente",
    celular: "3005554444",
    usuario: "nuevo01",
    password: "Valida123",
    confirmarPassword: "Valida123"
};

esperarError("Cédula con letras", () => registrar({ ...datosBase, cedula: "12AB5678" }));
esperarError("Cédula muy corta (5 dígitos)", () => registrar({ ...datosBase, cedula: "12345" }));
esperarError("Cédula muy larga (11 dígitos)", () => registrar({ ...datosBase, cedula: "12345678901" }));
esperarError("Usuario muy corto", () => registrar({ ...datosBase, usuario: "ab" }));
esperarError("Usuario con símbolos", () => registrar({ ...datosBase, usuario: "ana!@#" }));
esperarError("Contraseña muy corta", () => registrar({ ...datosBase, password: "Ab1", confirmarPassword: "Ab1" }));
esperarError("Contraseña sin mayúscula", () => registrar({ ...datosBase, password: "valida123", confirmarPassword: "valida123" }));
esperarError("Contraseña sin minúscula", () => registrar({ ...datosBase, password: "VALIDA123", confirmarPassword: "VALIDA123" }));
esperarError("Contraseña sin número", () => registrar({ ...datosBase, password: "ValidaSegura", confirmarPassword: "ValidaSegura" }));
esperarError("Confirmación de contraseña distinta", () => registrar({ ...datosBase, confirmarPassword: "Otra12345" }));
esperarError("Usuario repetido (ANA123 = ana123)", () => registrar({ ...datosBase, usuario: "ANA123" }));
esperarError("Cédula repetida", () => registrar({ ...datosBase, cedula: "1020304050" }));
esperarError("Falta el nombre completo", () => registrar({ ...datosBase, nombreCompleto: "" }));

console.log("\n===== 4. Login correcto =====");

const tokenAna = login("ana123", PASSWORD_ANA);
console.log(`  Token recibido: ${tokenAna.slice(0, 8)}... (solo se muestra el inicio)`);
comprobar("El token es válido justo después del login", validarToken(tokenAna) !== null);

esperarError("Ana se equivoca una vez", () => login("ana123", PASSWORD_INCORRECTA));
comprobar("Ana tiene 1 intento fallido", ana.intentosFallidos === 1);
const otroTokenAna = login("ana123", PASSWORD_ANA);
comprobar("Un login correcto reinicia los intentos fallidos a 0", ana.intentosFallidos === 0);
logout(otroTokenAna);

console.log("\n===== 5. Login incorrecto 3 veces (bloqueo) =====");

const mensajeNoExiste = esperarError("Usuario que no existe", () => login("fantasma99", PASSWORD_INCORRECTA));
const mensajeClaveMala = esperarError("Carlos, contraseña incorrecta (intento 1)", () => login("carlos01", PASSWORD_INCORRECTA));
comprobar("Ambos errores dan el MISMO mensaje (no revela si el usuario existe)", mensajeNoExiste === mensajeClaveMala);

esperarError("Carlos, contraseña incorrecta (intento 2)", () => login("carlos01", PASSWORD_INCORRECTA));
comprobar("Tras 2 intentos, Carlos todavía NO está bloqueado", carlos.bloqueado === false);

esperarError("Carlos, contraseña incorrecta (intento 3)", () => login("carlos01", PASSWORD_INCORRECTA));
comprobar("Tras 3 intentos fallidos, Carlos queda BLOQUEADO", carlos.bloqueado === true);

esperarError("Cuenta bloqueada: ni con la contraseña correcta puede entrar", () => login("carlos01", PASSWORD_CARLOS));

console.log("\n===== 6. Logout =====");

comprobar("logout() cierra la sesión de Ana", logout(tokenAna) === true);
comprobar("Después del logout, el token ya no es válido", validarToken(tokenAna) === null);
comprobar("Después del logout, el token no tiene permisos", tienePermiso(tokenAna, ACCIONES.CONSULTAR_SALDO) === false);
comprobar("Hacer logout otra vez con el mismo token retorna false", logout(tokenAna) === false);

console.log("\n===== 7. Token expirado (30 minutos) =====");

// Simulamos el paso del tiempo enviando una fecha "futura" a validarToken()
const tokenTemporal = login("ana123", PASSWORD_ANA);
const dentroDe29Minutos = new Date(Date.now() + 29 * 60 * 1000);
const dentroDe31Minutos = new Date(Date.now() + 31 * 60 * 1000);

comprobar("A los 29 minutos la sesión sigue activa", validarToken(tokenTemporal, dentroDe29Minutos) !== null);
comprobar("A los 31 minutos la sesión ya expiró", validarToken(tokenTemporal, dentroDe31Minutos) === null);
comprobar("El token expirado se elimina: tampoco sirve después", validarToken(tokenTemporal) === null);

console.log("\n===== 8. Permisos: CLIENTE vs ADMIN =====");

const tokenCliente = login("ana123", PASSWORD_ANA);
const tokenAdmin = login("admin01", PASSWORD_ADMIN);

comprobar("CLIENTE puede consultar saldo", tienePermiso(tokenCliente, ACCIONES.CONSULTAR_SALDO));
comprobar("CLIENTE puede transferir", tienePermiso(tokenCliente, ACCIONES.TRANSFERIR));
comprobar("CLIENTE NO puede bloquear clientes", !tienePermiso(tokenCliente, ACCIONES.BLOQUEAR_CLIENTE));
comprobar("CLIENTE NO puede desbloquear clientes", !tienePermiso(tokenCliente, ACCIONES.DESBLOQUEAR_CLIENTE));
comprobar("CLIENTE NO puede ver la auditoría", !tienePermiso(tokenCliente, ACCIONES.VER_AUDITORIA));

comprobar("ADMIN puede consultar saldo", tienePermiso(tokenAdmin, ACCIONES.CONSULTAR_SALDO));
comprobar("ADMIN puede transferir", tienePermiso(tokenAdmin, ACCIONES.TRANSFERIR));
comprobar("ADMIN puede bloquear clientes", tienePermiso(tokenAdmin, ACCIONES.BLOQUEAR_CLIENTE));
comprobar("ADMIN puede desbloquear clientes", tienePermiso(tokenAdmin, ACCIONES.DESBLOQUEAR_CLIENTE));
comprobar("ADMIN puede ver la auditoría", tienePermiso(tokenAdmin, ACCIONES.VER_AUDITORIA));

comprobar("Un token inventado no tiene ningún permiso", !tienePermiso("token-falso", ACCIONES.CONSULTAR_SALDO));

esperarError("Un CLIENTE intenta desbloquear a Carlos", () => desbloquearCliente(tokenCliente, carlos.cedula));
comprobar("Carlos sigue bloqueado", carlos.bloqueado === true);

desbloquearCliente(tokenAdmin, carlos.cedula);
comprobar("El ADMIN desbloqueó a Carlos", carlos.bloqueado === false && carlos.intentosFallidos === 0);

const tokenCarlos = login("carlos01", PASSWORD_CARLOS);
comprobar("Carlos ya puede iniciar sesión de nuevo", validarToken(tokenCarlos) !== null);

bloquearCliente(tokenAdmin, carlos.cedula);
comprobar("Si el ADMIN bloquea a Carlos, su sesión abierta pierde los permisos", !tienePermiso(tokenCarlos, ACCIONES.CONSULTAR_SALDO));

logout(tokenCliente);
logout(tokenAdmin);

console.log("\n===== 9. Historial de auditoría =====");

const historial = listarHistorial();
console.table(historial.map(registro => ({
    fecha: registro.fecha.toLocaleString("es-CO"),
    evento: registro.evento,
    usuario: registro.usuario,
    detalle: registro.detalle
})));

// some() = "¿al menos uno cumple?"
const huboEvento = (evento) => historial.some(registro => registro.evento === evento);
comprobar("Se registraron logins exitosos", huboEvento(EVENTOS.LOGIN_EXITOSO));
comprobar("Se registraron logins fallidos", huboEvento(EVENTOS.LOGIN_FALLIDO));
comprobar("Se registraron bloqueos", huboEvento(EVENTOS.BLOQUEO));
comprobar("Se registraron logouts", huboEvento(EVENTOS.LOGOUT));

const textoHistorial = JSON.stringify(historial);
const contrasenasDePrueba = [PASSWORD_ANA, PASSWORD_CARLOS, PASSWORD_ADMIN, PASSWORD_INCORRECTA];
comprobar("Ninguna contraseña aparece en la auditoría", !contrasenasDePrueba.some(p => textoHistorial.includes(p)));

console.log(`\n===== RESUMEN: ${pruebasOk} pruebas OK, ${pruebasFallidas} fallidas =====`);

// Si algo falló, el programa termina con código de error (útil para automatizar)
if (pruebasFallidas > 0) {
    process.exitCode = 1;
}
