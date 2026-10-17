# Respuestas prueba de conocimiento POO

## 1. ¿Qué es una Clase, un Objeto y un método?

Una clase es como un molde o una plantilla donde uno define qué datos va a tener algo y qué va a poder hacer. En el proyecto del banco tenemos la clase Cuenta, que dice que toda cuenta tiene un número, un saldo y una lista de movimientos.

Un objeto es lo que se crea a partir de ese molde, o sea ya una cuenta "real" con sus propios datos. Cuando hacemos new CuentaAhorros("AH-001", 1000000) eso ya es un objeto, y con la misma clase se pueden crear muchos objetos distintos, cada uno con su saldo.

Un método es una función que está dentro de la clase y representa algo que el objeto puede hacer. En Cuenta los métodos son consignar(), retirar() y consultarSaldo().

```js
// cuenta.js -> la clase (el molde)
export default class Cuenta {

    _numeroCuenta;
    _saldo;
    _movimientos;

    constructor(numeroCuenta, saldoInicial = 0) {
        this._numeroCuenta = numeroCuenta;
        this._saldo = saldoInicial;
        this._movimientos = [];
    }

    consultarSaldo() {
        return this._saldo;
    }

    consignar(monto) {
        if (monto <= 0) {
            throw new Error("El monto a consignar debe ser mayor a cero");
        }
        this._saldo += monto;
        this.registrarMovimiento("Consignación", monto);
        return this._saldo;
    }
}

// main.js -> aquí se crean los objetos
const ahorros = new CuentaAhorros("AH-001", 1000000);
const corriente = new CuentaCorriente("CC-001", 1000000);
ahorros.retirar(100000); // se llama un método del objeto
```

Cuenta es la clase, ahorros y corriente son dos objetos diferentes (cada uno guarda su propio saldo) y consignar, retirar y consultarSaldo son los métodos. El constructor es un método especial que se ejecuta automáticamente cuando se crea el objeto y le pone los valores iniciales.

---

## 2. Ventajas de usar la Programación Orientada a Objetos

- Se puede reutilizar código. En el proyecto consignar() se escribió una sola vez en Cuenta y lo usan CuentaAhorros, CuentaCorriente y TarjetaCredito sin volver a escribirlo.
- El código queda más ordenado porque cada clase se encarga de lo suyo (Cliente de los datos del cliente, Sesion del token, Cuenta del saldo).
- Es más fácil de mantener. Si hay que cambiar cómo se cobra el interés de ahorros solo se modifica CuentaAhorros.
- Protege los datos gracias al encapsulamiento, por ejemplo nadie puede leer la contraseña del cliente desde afuera.
- Se parece a cómo pensamos las cosas en la vida real (cliente, cuenta, tarjeta), entonces es más fácil entender el problema.
- Facilita el trabajo en equipo, en nuestro caso cada integrante hizo una parte (clases, transacciones, seguridad) y después se unió todo.
- Es fácil agregar cosas nuevas: si mañana se necesita una cuenta CDT se crea otra clase que herede de Cuenta.

---

## 3. ¿A qué se refiere la abstracción en POO?

La abstracción es quedarse solo con lo importante de algo y dejar por fuera lo que no le sirve al programa. Cuando modelamos un cliente del banco no nos interesa su estatura o su color favorito, solo la cédula, nombre, celular, usuario y contraseña, que es lo que el sistema necesita.

También tiene que ver con esconder el "cómo" de las cosas. Por ejemplo el servicio de transacciones solo llama cuenta.retirar(monto) y no sabe ni le importa cómo se calcula el interés o el sobregiro, eso lo resuelve cada clase por dentro. Es como manejar un carro: uno usa el pedal y el timón sin necesidad de saber cómo funciona el motor.

```js
// transaccionesService.js
export function retirar(numeroCuenta, monto) {
    const cuenta = buscarPorNumero(numeroCuenta);
    return cuenta.retirar(monto);
}
```

---

## 4. ¿Qué es la herencia en POO?

La herencia es cuando una clase hija toma los atributos y métodos de una clase padre, y además puede agregar cosas propias o cambiar algunas. Sirve sobre todo para no repetir código. En JavaScript se hace con extends y super.

```js
// cuentaAhorros.js
import Cuenta from './cuenta.js';

export default class CuentaAhorros extends Cuenta {

    #tasaInteres = 0.015; // 1.5% mensual

    constructor(numeroCuenta, saldoInicial = 0) {
        super(numeroCuenta, saldoInicial);
    }

    get tasaInteres() { return this.#tasaInteres; }
}

// cuentaCorriente.js
export default class CuentaCorriente extends Cuenta {

    #sobregiro = 0.20; // 20%

    constructor(numeroCuenta, saldoInicial = 0) {
        super(numeroCuenta, saldoInicial);
    }
}
```

CuentaAhorros extends Cuenta, entonces hereda el número de cuenta, el saldo, los movimientos y los métodos consignar(), consultarSaldo() y registrarMovimiento(). Por eso en CuentaAhorros no está escrito consignar() y aun así se puede usar. Con super(...) se llama al constructor de Cuenta para que inicialice esos datos. Lo único que agrega CuentaAhorros es su tasa de interés. Lo mismo pasa con CuentaCorriente, que agrega el sobregiro del 20%, y con TarjetaCredito, que agrega el cupo y la deuda.

---

## 5. ¿Qué es polimorfismo en POO?

Polimorfismo es cuando un mismo método se comporta diferente dependiendo del objeto que lo ejecuta. En el proyecto todas las cuentas tienen el método retirar(), pero cada clase hija lo sobrescribe (override) y lo hace a su manera.

```js
// transaccionesService.js
export function retirar(numeroCuenta, monto) {
    const cuenta = buscarPorNumero(numeroCuenta);
    return cuenta.retirar(monto);
}

// CuentaAhorros: cobra el 1.5% de interés sobre lo que se retira
retirar(monto) {
    const interes = monto * this.#tasaInteres;
    const totalADescontar = monto + interes;

    if (totalADescontar > this._saldo) {
        throw new Error(
            `Saldo insuficiente. Se requieren $${totalADescontar.toFixed(2)} (incluye 1.5% de interés)`
        );
    }
    this._saldo -= totalADescontar;
    this.registrarMovimiento("Retiro con interés (1.5%)", totalADescontar);
    return this._saldo;
}

// CuentaCorriente: deja retirar hasta el saldo + 20% de sobregiro
retirar(monto) {
    const limiteRetiro = this._saldo * (1 + this.#sobregiro);

    if (monto > limiteRetiro) {
        throw new Error(
            `El monto supera el límite permitido (saldo + 20% de sobregiro): $${limiteRetiro.toFixed(2)}`
        );
    }
    this._saldo -= monto;
    this.registrarMovimiento("Retiro", monto);
    return this._saldo;
}

// TarjetaCredito: no permite retiros
retirar(monto) {
    throw new Error("TarjetaCredito no soporta retiros directos. Use calcularCuota() para financiar una compra.");
}
```

La función retirar del servicio no pregunta qué tipo de cuenta es, simplemente llama cuenta.retirar(monto). Si la cuenta es de ahorros se cobra el interés, si es corriente deja usar el sobregiro y si es una tarjeta sale un error. El mismo llamado da resultados distintos según el objeto, eso es el polimorfismo. La ventaja es que si se agrega otro tipo de cuenta no hay que cambiar el servicio.

---

## 6. ¿Qué es el encapsulamiento en POO?

Encapsular es esconder los datos internos de un objeto para que no se puedan cambiar directamente desde afuera, sino solo por medio de los métodos que la clase permite. Así se protege la información y se controla que se modifique de la forma correcta. En JavaScript los atributos privados se marcan con #.

```js
// cliente.js
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

    // ===== Getters =====
    get cedula() { return this.#cedula; }
    get nombreCompleto() { return this.#nombreCompleto; }
    get usuario() { return this.#usuario; }
    get bloqueado() { return this.#bloqueado; }
    // Nota: NO existe getter para el hash de la contraseña, por seguridad.

    // ===== Setters =====
    set nombreCompleto(valor) { this.#nombreCompleto = valor; }
    set celular(valor) { this.#celular = valor; }

    verificarPassword(passwordPlano) {
        return verificar(passwordPlano, this.#passwordHash);
    }

    cambiarPassword(passwordActual, passwordNueva, confirmarPasswordNueva) {
        if (!this.verificarPassword(passwordActual)) {
            throw new Error("La contraseña actual no coincide");
        }
        if (passwordNueva !== confirmarPasswordNueva) {
            throw new Error("La nueva contraseña y su confirmación no coinciden");
        }
        validarPassword(passwordNueva);
        this.#passwordHash = hashear(passwordNueva);
        return true;
    }
}
```

Todos los atributos de Cliente son privados. Desde afuera algunos se pueden leer con los getters, pero no se pueden modificar directamente (por ejemplo no se puede hacer cliente.#bloqueado = false). El caso más claro es la contraseña: no tiene getter, entonces nadie puede leer el hash. Si se quiere saber si una contraseña es correcta se usa verificarPassword(), y para cambiarla toca pasar por cambiarPassword(), que primero revisa la contraseña actual y que la nueva cumpla las reglas. Solo dejamos setters para el nombre y el celular, que son los datos que el cliente sí puede editar.

Un detalle: en la clase Cuenta usamos _saldo en vez de #saldo porque los atributos con # no los pueden tocar ni las clases hijas, y CuentaAhorros y CuentaCorriente necesitan modificar el saldo al retirar.

---

## 7. Comparación entre interfaces y clases abstractas

Clase abstracta:
- Es una clase que no se puede instanciar, solo sirve de base para que otras hereden de ella.
- Puede tener atributos, constructor, métodos ya programados y también métodos abstractos (sin código) que las hijas están obligadas a implementar.
- Una clase solo puede heredar de una clase (herencia simple).
- Se usa cuando varias clases son del mismo tipo y comparten código, la relación es "es un". Ejemplo: CuentaAhorros es una Cuenta.

Interfaz:
- Es como un contrato, solo dice qué métodos tiene que tener una clase pero no cómo se hacen.
- No tiene atributos (solo constantes) ni constructor. En Java desde la versión 8 pueden tener métodos default, pero la idea sigue siendo la de un contrato.
- Una clase puede implementar varias interfaces al mismo tiempo.
- Se usa para definir capacidades que pueden compartir clases que no tienen nada que ver entre sí, la relación es "puede hacer". Ejemplo: una interfaz Pagable la podría implementar TarjetaCredito y también una clase FacturaServicio.

En JavaScript no existen las palabras abstract ni interface (sí existen en Java o TypeScript). En nuestro proyecto la clase Cuenta funciona como una clase abstracta: nunca creamos una "Cuenta" sola, siempre creamos CuentaAhorros, CuentaCorriente o TarjetaCredito. Tiene código que comparten todas (consignar, registrarMovimiento) y métodos que se dejaron sin implementar para completarlos después:

```js
// cuenta.js
export default class Cuenta {

    consignar(monto) { ... }          // código compartido por todas las hijas
    registrarMovimiento(tipo, valor) { ... }

    // Las subclases SOBRESCRIBEN este método para aplicar sus propias reglas
    retirar(monto) { ... }

    // ===== CRUD (persistencia) =====
    create() {
        // pendiente: guardar la cuenta en el almacenamiento
    }
    selectAll() {
        // pendiente: retornar todas las cuentas almacenadas
    }
    update(id) {
        // pendiente: actualizar una cuenta existente por id
    }
    selectById(id) {
        // pendiente: buscar una cuenta específica por id
    }
}
```

Si quisiéramos que JavaScript no deje crear una Cuenta directamente, en el constructor se podría poner: if (new.target === Cuenta) throw new Error("Cuenta es abstracta").

Así se vería en Java, donde sí existen las dos cosas:

```java
// Clase abstracta
public abstract class Cuenta {
    protected String numeroCuenta;
    protected double saldo;

    public Cuenta(String numeroCuenta, double saldo) {
        this.numeroCuenta = numeroCuenta;
        this.saldo = saldo;
    }

    public void consignar(double monto) {   // método con código
        saldo += monto;
    }

    public abstract void retirar(double monto);   // cada hija lo implementa
}

// Interfaz
public interface Transferible {
    void transferir(Cuenta destino, double monto);
}

// Hereda de UNA clase abstracta y puede implementar VARIAS interfaces
public class CuentaAhorros extends Cuenta implements Transferible {
    ...
}
```

---

## 8. ¿Qué es la composición de clases, cómo se usa y para qué sirve?

La composición es cuando una clase está formada por objetos de otras clases, es una relación de "tiene un" o "es parte de". Lo que la hace especial es que las partes no pueden existir sin el todo: si se elimina el objeto principal también se eliminan sus partes. (Si las partes pudieran existir solas sería agregación.)

Se usa creando o guardando los objetos "parte" dentro de la clase principal, normalmente como atributos. En el proyecto pasa con la Cuenta y sus movimientos: la cuenta crea sus propios movimientos en registrarMovimiento() y los guarda en _movimientos. Un movimiento no tiene sentido sin su cuenta, y si se elimina la cuenta los movimientos se van con ella.

```js
// cuenta.js
constructor(numeroCuenta, saldoInicial = 0) {
    this._numeroCuenta = numeroCuenta;
    this._saldo = saldoInicial;
    this._movimientos = [];   // la cuenta "tiene" sus movimientos
}

get movimientos() { return [...this._movimientos]; } // copia, no la referencia real

registrarMovimiento(tipo, valor) {
    this._movimientos.push({
        fecha: new Date(),
        tipo,
        valor
    });
}
```

Algo parecido pasa entre el cliente y sus cuentas: cuando el administrador elimina un cliente también se eliminan todas sus cuentas (eliminarCuentasPorCliente).

Sirve para armar objetos complejos a partir de otros más sencillos, para reutilizar código sin tener que heredar (por eso se dice "preferir composición sobre herencia") y para que el código sea más flexible, porque las partes se pueden cambiar sin tocar toda la clase.

---

## 9. Inversión de dependencias

Es la D de SOLID. Dice que los módulos de alto nivel (los que tienen las reglas del negocio) no deberían depender de los módulos de bajo nivel (detalles como la base de datos o los archivos), sino que los dos deberían depender de una abstracción. La idea es que si cambia el detalle no haya que tocar la lógica del negocio.

En el proyecto lo aplicamos con los repositorios. El authService, que tiene las reglas de registro y login, no lee ni escribe archivos y no sabe que los clientes se guardan en un JSON. Solo usa las funciones del repositorio:

```js
// authService.js (alto nivel: reglas del negocio)
import { guardar, buscarPorUsuario, buscarPorCedula, existeUsuario, persistirCambios } from '../repository/clienteRepository.js';

function crearYGuardarCliente(datos, rol) {
    ...
    // 2. Evitar duplicados
    if (buscarPorCedula(cedula) !== null) {
        throw new Error("Ya existe un cliente registrado con esa cédula");
    }
    if (existeUsuario(usuario)) {
        throw new Error("El nombre de usuario ya está en uso");
    }

    const cliente = Cliente.registrar(cedula, nombreCompleto, celular, usuario, password, confirmarPassword, rol);

    // 4. Guardar en el repositorio
    return guardar(cliente);
}

// clienteRepository.js (bajo nivel: el detalle de cómo se guarda)
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

export function guardar(cliente) {
    clientes.set(cliente.cedula, cliente);
    guardarEnDisco();
    return cliente;
}
```

El único que sabe de fs y del archivo data/clientes.json es el repositorio. Si después queremos guardar los clientes en MySQL, se cambia el repositorio manteniendo las mismas funciones (guardar, buscarPorCedula, etc.) y el authService queda igual.

Siendo sinceros, no lo cumplimos al 100% porque authService importa directamente el archivo clienteRepository.js. Para que fuera inversión de dependencias completa el servicio debería recibir el repositorio desde afuera (por el constructor o por parámetro), y ahí es donde entra la inyección de dependencias.

---

## 10. Inyección de dependencias

La inyección de dependencias es cuando un objeto o una función recibe desde afuera las cosas que necesita para funcionar, en vez de crearlas ella misma por dentro. Así es más fácil cambiar esas dependencias y sobre todo hacer pruebas.

En el proyecto lo usamos con la fecha de las sesiones. Para saber si una sesión ya expiró se necesita la fecha actual, pero en vez de que el método haga siempre new Date() por dentro, la recibe como parámetro (y si no se la mandan usa la de ese momento):

```js
// sesion.js
estaActiva(fechaActual = new Date()) {
    return fechaActual < this.#fechaExpiracion;
}

// sesionService.js
export function validarToken(token, fechaActual = new Date()) {
    const sesion = sesiones.get(token);
    if (!sesion) {
        return null;
    }
    if (!sesion.estaActiva(fechaActual)) {
        sesiones.delete(token);
        return null;
    }
    return sesion;
}

// testSeguridad.js -> en la prueba le inyectamos una fecha "futura"
const tokenTemporal = login("ana123", PASSWORD_ANA);
const dentroDe29Minutos = new Date(Date.now() + 29 * 60 * 1000);
const dentroDe31Minutos = new Date(Date.now() + 31 * 60 * 1000);

comprobar("A los 29 minutos la sesión sigue activa", validarToken(tokenTemporal, dentroDe29Minutos) !== null);
comprobar("A los 31 minutos la sesión ya expiró", validarToken(tokenTemporal, dentroDe31Minutos) === null);
```

Gracias a eso en las pruebas pudimos pasarle una fecha de 31 minutos en el futuro para comprobar que la sesión se vence a los 30 minutos, sin tener que esperar media hora de verdad.

También pasa con la ruta de los archivos de datos. El repositorio no tiene la ruta fija, la recibe desde afuera por la variable de entorno CLIENTES_DB_PATH, y en las pruebas se le inyecta un archivo temporal para no dañar los datos reales:

```js
// clienteRepository.js
const rutaArchivo = process.env.CLIENTES_DB_PATH
    ? path.resolve(process.env.CLIENTES_DB_PATH)
    : path.resolve(directorioRepositorio, '../../data/clientes.json');

// testPersistencia.js
process.env.CLIENTES_DB_PATH = archivoClientes;
```

---

## 11. Ventajas de la arquitectura por capas

En el proyecto separamos el código en capas: classes (las entidades como Cliente y Cuenta), repository (guardar y buscar datos), services (la lógica del negocio), security (hash, roles y validaciones) y la parte de presentación (index.html, ui.js y la API en server.js).

1. Cada capa tiene una sola responsabilidad, entonces el código es más ordenado y fácil de entender.
2. El mantenimiento es más fácil: si falla el login sabemos que hay que buscar en authService y no en todo el proyecto.
3. Se puede cambiar una capa sin dañar las otras. Por ejemplo cambiar los archivos JSON por una base de datos solo afecta los repositorios.
4. Cada capa se puede probar por separado, por eso tenemos testPersistencia, testSeguridad, testTransacciones, etc.
5. Se reutiliza código: los mismos servicios los usa el servidor (la API) y también las pruebas.
6. Facilita el trabajo en equipo porque cada integrante puede trabajar en una capa sin dañar lo de los demás.
7. Mejora la seguridad: las validaciones y los permisos están en los servicios, así que aunque alguien modifique la página no se puede saltar las reglas.
8. Es más fácil hacer crecer el sistema y agregar funciones nuevas.

---

## 12. ¿Qué son los principios SOLID? Explique al menos 1

Son cinco principios de diseño para que el código orientado a objetos sea más fácil de mantener, entender y ampliar:

- S: Responsabilidad única
- O: Abierto/cerrado
- L: Sustitución de Liskov
- I: Segregación de interfaces
- D: Inversión de dependencias

Responsabilidad única (S): cada clase o módulo debe encargarse de una sola cosa, o sea tener una sola razón para cambiar. En el proyecto lo tratamos de cumplir separando todo: passwordHasher solo convierte y verifica contraseñas, sesionService solo crea y valida sesiones, auditoriaService solo registra los eventos de seguridad y validadores solo revisa formatos (cédula, usuario, contraseña). Si mañana queremos cambiar el algoritmo de hash de scrypt a bcrypt solo se modifica passwordHasher.js y lo demás sigue igual.

Abierto/cerrado (O): una clase debe estar abierta para extenderse pero cerrada para modificarse. En el proyecto si queremos una cuenta nueva, por ejemplo un CDT, creamos una clase que herede de Cuenta con su propio retirar() y no hay que modificar Cuenta ni el servicio de transacciones.

---

## 13. Diagrama de clases con herencia

Archivo: diagrama_herencia.png

Muestra la clase padre Cuenta y sus tres clases hijas (CuentaAhorros, CuentaCorriente y TarjetaCredito). La flecha con triángulo vacío apunta a la clase padre e indica herencia. Las hijas heredan número de cuenta, saldo, movimientos, consignar() y consultarSaldo(), agregan sus propios atributos y sobrescriben retirar().

---

## 14. Diagrama del programa de recomendación de películas

Archivo: diagrama_peliculas.png

Relaciones que se aplicaron:
- Herencia: Administrador y Espectador heredan de Usuario (clase abstracta), porque los dos inician sesión y ven películas, pero el admin crea/edita/elimina películas y el espectador da me gusta y comenta.
- Composición (rombo negro): Pelicula con Comentario y con MeGusta, si se elimina la película se eliminan sus comentarios y me gusta. También PlataformaPeliculas con Reproductor y con Catalogo, son partes del programa.
- Agregación (rombo blanco): Categoria con Pelicula y Catalogo con Pelicula, la categoría agrupa películas pero la película sigue existiendo aunque se borre la categoría. PlataformaPeliculas con Usuario también es agregación.
- Asociación simple (flecha normal): el Reproductor reproduce una Pelicula, el Administrador crea Peliculas y el Espectador escribe Comentarios y da MeGusta.
