# SistemaBancarioMiPlata

## Ejecutar la aplicación

Desde esta carpeta, inicia el servidor estático con `npm start` y abre <http://localhost:3000>.
No hay API bancaria: el servidor solo entrega los archivos de la página y escucha en `127.0.0.1`. Las operaciones se ejecutan en el navegador y la información se guarda en `localStorage` de ese navegador. No abras la página con doble clic; utiliza la dirección local indicada para que el navegador habilite las funciones criptográficas.

Para validar el sistema ejecuta `npm test`. No requiere base de datos ni servicios externos. Las cuentas e historiales nuevos quedan en el almacenamiento local del navegador y no se sincronizan con otros navegadores o dispositivos. Las fuentes del sistema también usan tipografías de respaldo para funcionar sin conexión.

La página de inicio, los formularios de acceso y el panel bancario comparten la hoja de estilos responsive `styles.css`. Los perfiles, hashes de contraseña, productos y movimientos se almacenan en `localStorage`. Las contraseñas se protegen con PBKDF2 mediante Web Crypto; no guardamos la contraseña original. Al registrarse correctamente, se inicia sesión y se abre el panel automáticamente. El modo local es para demostración académica: una persona con acceso al navegador puede inspeccionar o modificar el almacenamiento y los roles no son controles de seguridad del lado servidor.

## Funciones

- El cliente registrado inicia sesión, abre cuentas de ahorros o corriente y una tarjeta de crédito, consulta saldos e historial, consigna, retira y transfiere.
- Las cuentas de ahorros descuentan el interés implementado por su clase al retirar. La cuenta corriente aplica su regla de sobregiro.
- Las compras con tarjeta permiten elegir cuotas; el panel también permite pagar la deuda desde una cuenta propia.
- Los números de cuenta se comparten con el destinatario para poder recibir transferencias.
- Los movimientos de cada producto quedan guardados junto con su cuenta en el almacenamiento local del navegador y sobreviven al cierre o recarga de la página en el mismo navegador.
- Los JSON anteriores en `data/` no se importan automáticamente; el modo local inicia su propio almacenamiento independiente.
- Es un simulador académico local; las consignaciones no representan dinero real.

## Administración y modo local

La administración de usuarios y la creación de administradores requieren un backend y están desactivadas en el modo sin API. El registro local solo crea perfiles `CLIENTE`.

El navegador almacena los datos asociados a este origen local. Si se borran los datos del navegador, se pierde el historial; exporta o respalda los datos antes de limpiar el almacenamiento. El sistema es un simulador académico y no debe utilizarse con dinero ni credenciales reales.




## 📋 Historias de Usuario (Metodología Ágil / POO)

---

### HU-01 · Persona / Cuenta (Clase Base / Abstracta)

- **Como:** Desarrollador del sistema bancario "Mi Plata".
- **Quiero:** Definir una clase abstracta base `Cuenta` que contenga los atributos esenciales de cualquier producto financiero (número de cuenta, saldo, titular y lista de movimientos) y los métodos genéricos para operar sobre ella.
- **Para:** Garantizar el pilar de **Abstracción** y reutilizar código estructurado para la jerarquía de los productos financieros del banco.

**Criterios de Aceptación:**

1. Toda cuenta debe asociarse obligatoriamente a un `Cliente` mediante un identificador único.
2. No debe permitir la instanciación directa de la clase base `Cuenta` (funciona como plantilla abstracta).
3. Debe implementar el método `consignar(monto)` validando que el monto ingresado sea un número positivo mayor a cero.
4. Debe mantener una estructura `Array` (o `List<T>`) para el historial de movimientos, guardando fecha/hora, tipo de transacción y valor.

---

### HU-02 · Cuenta de Ahorros

- **Como:** Cliente registrado en la plataforma bancaria.
- **Quiero:** Realizar consignaciones y retiros en mi Cuenta de Ahorros, aplicando los rendimientos e intereses fijados por el banco.
- **Para:** Guardar mi dinero a mediano y largo plazo y obtener rentabilidad sobre mis ahorros.

**Criterios de Aceptación:**

1. Hereda los atributos y comportamientos de la clase base `Cuenta`.
2. El monto a retirar no puede superar el saldo disponible (restricción estricta).
3. Al realizar un retiro, el sistema debe calcular y aplicar automáticamente una tasa de interés mensual del **1.5%**.
4. Sobrescribe mediante **Polimorfismo** el método `retirar(monto)`, adaptándolo a la regla de interés del producto.

---

### HU-03 · Cuenta Corriente

- **Como:** Cliente de la sucursal "Mi Plata".
- **Quiero:** Gestionar fondos y realizar retiros en mi Cuenta Corriente con la posibilidad de sobregiro autorizado.
- **Para:** Administrar mis pagos diarios y disponer de liquidez adicional cuando mi saldo sea insuficiente.

**Criterios de Aceptación:**

1. Hereda de la clase base `Cuenta`.
2. No genera ni aplica tasas de interés por retiros o saldos.
3. Implementa por **Polimorfismo** el método `retirar(monto)`, permitiendo un sobregiro de hasta un **20%** adicional sobre el saldo actual:
   ```
   Límite = Saldo × 1.20
   ```
4. Si el monto a retirar excede el saldo más el 20% de sobregiro, el sistema debe denegar la operación y mostrar un mensaje de error explícito.

---

### HU-04 · Tarjeta de Crédito

- **Como:** Cliente de la sucursal "Mi Plata".
- **Quiero:** Diferir mis compras a cuotas seleccionando el plazo en meses y visualizando el cálculo de intereses.
- **Para:** Financiar compras utilizando mi cupo asignado y conocer exactamente el valor de la cuota mensual a pagar.

**Criterios de Aceptación:**

1. Hereda los datos del producto bancario y gestiona un cupo de crédito disponible asignado.
2. Aplica las tasas de interés mensuales según el rango de cuotas:

   | Número de cuotas | Interés mensual |
   |:----------------:|:---------------:|
   | ≤ 2              | 0%              |
   | 3 a 6            | 1.9%            |
   | ≥ 7              | 2.3%            |

3. Calcula el valor exacto de la cuota mensual mediante la fórmula de amortización:
   ```
   Cuota = (Capital × tasa) / (1 - (1 + tasa)^(-n))
   ```
4. Muestra de forma clara y transparente al usuario el valor del pago mensual resultante antes de confirmar la transacción.

---

### HU-05 · Módulo de Autenticación y Control de Intentos

- **Como:** Usuario / Cliente del banco.
- **Quiero:** Iniciar sesión con mis credenciales (usuario y contraseña) contando con un límite de intentos fallidos.
- **Para:** Proteger el acceso a mi información financiera y evitar ataques no autorizados.

**Criterios de Aceptación:**

1. Muestra en pantalla un contador visible con el número de intentos de inicio de sesión.
2. Si el usuario ingresa sus datos de forma errónea por **3 intentos consecutivos**, el sistema debe bloquear automáticamente la cuenta.
3. Despliega un mensaje informativo claro notificando el bloqueo de la cuenta.
4. Al autenticarse exitosamente, el usuario es redirigido inmediatamente al panel principal de transacciones (Cajero Web).