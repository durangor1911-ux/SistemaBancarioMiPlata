const estadoRegistro = document.getElementById('estadoRegistro');
const estadoLogin = document.getElementById('estadoLogin');
const estadoBancario = document.getElementById('estadoBancario');
const formRegistro = document.getElementById('formRegistro');
const formLogin = document.getElementById('formLogin');
const formProducto = document.getElementById('formProducto');
const formOperacion = document.getElementById('formOperacion');
const formTransferencia = document.getElementById('formTransferencia');
const formCompraTarjeta = document.getElementById('formCompraTarjeta');
const formPagoTarjeta = document.getElementById('formPagoTarjeta');
const btnLogout = document.getElementById('btnLogout');
const panelAcceso = document.getElementById('panelAcceso');
const panelBancario = document.getElementById('panelBancario');
const panelClientes = document.getElementById('panelClientes');
const listaClientes = document.getElementById('listaClientes');
const estadoClientes = document.getElementById('estadoClientes');
const btnActualizarClientes = document.getElementById('btnActualizarClientes');
const listaCuentas = document.getElementById('listaCuentas');
const listaMovimientos = document.getElementById('listaMovimientos');
const API_URL = 'http://localhost:3000/api';

let tokenActual = null;
let sesionActual = null;

async function llamarApi(ruta, opciones = {}) {
  let respuesta;
  try {
    const headers = { 'Content-Type': 'application/json', ...opciones.headers };
    if (tokenActual) headers.Authorization = `Bearer ${tokenActual}`;
    respuesta = await fetch(`${API_URL}${ruta}`, {
      ...opciones,
      headers,
    });
  } catch {
    throw new Error('No se pudo conectar con la API. Asegúrate de iniciar el servidor en el puerto 3000.');
  }

  const payload = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new Error(payload.message || 'La API devolvió un error.');
  }
  return payload;
}

function mostrarEstado(elemento, mensaje, tipo = 'info') {
  elemento.textContent = mensaje;
  elemento.className = `estado ${tipo}`;
}

async function registrarDesdeFormulario(evento) {
  evento.preventDefault();

  const datos = {
    cedula: document.getElementById('cedula').value.trim(),
    nombreCompleto: document.getElementById('nombreCompleto').value.trim(),
    celular: document.getElementById('celular').value.trim(),
    usuario: document.getElementById('usuarioRegistro').value.trim(),
    password: document.getElementById('passwordRegistro').value,
    confirmarPassword: document.getElementById('confirmarPassword').value,
  };

  try {
    const payload = await llamarApi('/registro', {
      method: 'POST',
      body: JSON.stringify(datos),
    });

    mostrarEstado(
      estadoRegistro,
      `Usuario registrado correctamente: ${payload.cliente.usuario}`,
      'exito'
    );
    formRegistro.reset();
  } catch (error) {
    mostrarEstado(estadoRegistro, error.message, 'error');
  }
}

function formatearDinero(valor) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 2 }).format(valor);
}

function esTarjeta(cuenta) {
  return cuenta.tipo === 'TarjetaCredito';
}

function llenarSelector(selector, cuentas, filtro = () => true, etiqueta = cuenta => `${cuenta.numeroCuenta} — ${cuenta.tipo}`) {
  selector.replaceChildren();
  const disponibles = cuentas.filter(filtro);
  for (const cuenta of disponibles) {
    const opcion = document.createElement('option');
    opcion.value = cuenta.numeroCuenta;
    opcion.textContent = etiqueta(cuenta);
    selector.append(opcion);
  }
  selector.disabled = disponibles.length === 0;
  return disponibles.length;
}

function dibujarCuentas(cuentas) {
  listaCuentas.replaceChildren();
  if (!cuentas.length) {
    const aviso = document.createElement('p');
    aviso.textContent = 'Aún no tienes productos. Abre una cuenta para comenzar.';
    listaCuentas.append(aviso);
  }

  for (const cuenta of cuentas) {
    const tarjeta = document.createElement('article');
    tarjeta.className = 'producto-card';
    const titulo = document.createElement('h3');
    titulo.textContent = cuenta.tipo === 'TarjetaCredito' ? 'Tarjeta de crédito' : cuenta.tipo === 'CuentaAhorros' ? 'Cuenta de ahorros' : 'Cuenta corriente';
    const numero = document.createElement('p');
    numero.textContent = `Número: ${cuenta.numeroCuenta}`;
    const saldo = document.createElement('p');
    saldo.textContent = esTarjeta(cuenta)
      ? `Deuda: ${formatearDinero(cuenta.deuda)} · Cupo disponible: ${formatearDinero(cuenta.cupoDisponible)}`
      : `Saldo: ${formatearDinero(cuenta.saldo)}`;
    tarjeta.append(titulo, numero, saldo);
    listaCuentas.append(tarjeta);
  }

  const etiquetaEfectivo = cuenta => `${cuenta.numeroCuenta} · ${formatearDinero(cuenta.saldo)}`;
  llenarSelector(document.getElementById('cuentaOperacion'), cuentas, cuenta => !esTarjeta(cuenta), etiquetaEfectivo);
  llenarSelector(document.getElementById('cuentaOrigen'), cuentas, cuenta => !esTarjeta(cuenta), etiquetaEfectivo);
  llenarSelector(document.getElementById('cuentaPago'), cuentas, cuenta => !esTarjeta(cuenta), etiquetaEfectivo);
  llenarSelector(document.getElementById('tarjetaCompra'), cuentas, esTarjeta, cuenta => `${cuenta.numeroCuenta} · disponible ${formatearDinero(cuenta.cupoDisponible)}`);
  llenarSelector(document.getElementById('tarjetaPago'), cuentas, esTarjeta, cuenta => `${cuenta.numeroCuenta} · deuda ${formatearDinero(cuenta.deuda)}`);
  llenarSelector(document.getElementById('cuentaMovimientos'), cuentas, () => true);
}

async function cargarCuentas() {
  try {
    const payload = await llamarApi('/cuentas');
    dibujarCuentas(payload.cuentas);
  } catch (error) {
    mostrarEstado(estadoBancario, error.message, 'error');
  }
}

async function cargarClientes() {
  if (sesionActual?.rol !== 'ADMIN') return;
  try {
    const payload = await llamarApi('/clientes');
    listaClientes.replaceChildren();
    if (!payload.clientes.length) {
      const fila = document.createElement('tr');
      const celda = document.createElement('td');
      celda.colSpan = 6;
      celda.textContent = 'Todavía no hay usuarios registrados.';
      fila.append(celda);
      listaClientes.append(fila);
    }
    for (const cliente of payload.clientes) {
      const fila = document.createElement('tr');
      for (const valor of [cliente.cedula, cliente.nombreCompleto, cliente.usuario, cliente.celular, cliente.rol]) {
        const celda = document.createElement('td');
        celda.textContent = valor;
        fila.append(celda);
      }
      const celdaAccion = document.createElement('td');
      if (cliente.rol === 'CLIENTE') {
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'btn-eliminar';
        boton.textContent = 'Eliminar';
        boton.addEventListener('click', () => eliminarCliente(cliente.cedula, cliente.usuario));
        celdaAccion.append(boton);
      } else {
        celdaAccion.textContent = 'Protegido';
      }
      fila.append(celdaAccion);
      listaClientes.append(fila);
    }
    mostrarEstado(estadoClientes, `${payload.clientes.length} usuario(s) registrado(s).`, 'exito');
  } catch (error) {
    mostrarEstado(estadoClientes, `No se pudo cargar la lista: ${error.message}`, 'error');
  }
}

async function eliminarCliente(cedula, usuario) {
  if (!confirm(`¿Deseas eliminar el usuario "${usuario}" y sus productos? Esta acción no se puede deshacer.`)) return;
  try {
    await llamarApi(`/clientes/${encodeURIComponent(cedula)}`, { method: 'DELETE' });
    await cargarClientes();
  } catch (error) {
    mostrarEstado(estadoClientes, error.message, 'error');
  }
}

async function iniciarSesionDesdeFormulario(evento) {
  evento.preventDefault();

  const usuario = document.getElementById('usuarioLogin').value.trim();
  const password = document.getElementById('passwordLogin').value;

  try {
    const payload = await llamarApi('/login', {
      method: 'POST',
      body: JSON.stringify({ usuario, password }),
    });

    tokenActual = payload.token;
    sesionActual = payload.sesion;
    panelAcceso.hidden = true;
    panelBancario.hidden = false;
    panelClientes.hidden = sesionActual.rol !== 'ADMIN';
    document.getElementById('saludoUsuario').textContent = `Hola, ${sesionActual.nombreCompleto}`;
    document.getElementById('rolUsuario').textContent = `Perfil: ${sesionActual.rol}`;
    mostrarEstado(estadoLogin, 'Sesión iniciada correctamente.', 'exito');
    formLogin.reset();
    await cargarCuentas();
    if (sesionActual.rol === 'ADMIN') await cargarClientes();
  } catch (error) {
    tokenActual = null;
    mostrarEstado(estadoLogin, error.message, 'error');
  }
}

async function cerrarSesion() {
  if (!tokenActual) {
    mostrarEstado(estadoLogin, 'No hay una sesión activa.', 'error');
    return;
  }

  try {
    await llamarApi('/logout', {
      method: 'POST',
      body: JSON.stringify({ token: tokenActual }),
    });

    mostrarEstado(estadoLogin, 'Sesión cerrada correctamente.', 'exito');
    tokenActual = null;
    sesionActual = null;
    panelBancario.hidden = true;
    panelClientes.hidden = true;
    listaClientes.replaceChildren();
    listaCuentas.replaceChildren();
    listaMovimientos.replaceChildren();
    panelAcceso.hidden = false;
  } catch (error) {
    mostrarEstado(estadoLogin, error.message, 'error');
  }
}

async function abrirProductoDesdeFormulario(evento) {
  evento.preventDefault();
  try {
    const payload = await llamarApi('/cuentas', {
      method: 'POST',
      body: JSON.stringify({ tipo: document.getElementById('tipoProducto').value }),
    });
    mostrarEstado(estadoBancario, `Producto creado: ${payload.cuenta.numeroCuenta}`, 'exito');
    formProducto.reset();
    await cargarCuentas();
  } catch (error) {
    mostrarEstado(estadoBancario, error.message, 'error');
  }
}

async function operarDesdeFormulario(evento) {
  evento.preventDefault();
  try {
    const payload = await llamarApi('/transacciones', {
      method: 'POST',
      body: JSON.stringify({
        accion: document.getElementById('accionOperacion').value,
        numeroCuenta: document.getElementById('cuentaOperacion').value,
        monto: document.getElementById('montoOperacion').value,
      }),
    });
    mostrarEstado(estadoBancario, `Operación exitosa. Nuevo saldo: ${formatearDinero(payload.resultado.saldo)}`, 'exito');
    formOperacion.reset();
    await cargarCuentas();
  } catch (error) {
    mostrarEstado(estadoBancario, error.message, 'error');
  }
}

async function transferirDesdeFormulario(evento) {
  evento.preventDefault();
  try {
    const payload = await llamarApi('/transferencias', {
      method: 'POST',
      body: JSON.stringify({
        cuentaOrigen: document.getElementById('cuentaOrigen').value,
        cuentaDestino: document.getElementById('cuentaDestino').value.trim(),
        monto: document.getElementById('montoTransferencia').value,
      }),
    });
    mostrarEstado(estadoBancario, `Transferencia realizada por ${formatearDinero(payload.resultado.monto)}.`, 'exito');
    formTransferencia.reset();
    await cargarCuentas();
  } catch (error) {
    mostrarEstado(estadoBancario, error.message, 'error');
  }
}

async function comprarConTarjetaDesdeFormulario(evento) {
  evento.preventDefault();
  try {
    const payload = await llamarApi('/tarjetas/compra', {
      method: 'POST',
      body: JSON.stringify({
        numeroCuenta: document.getElementById('tarjetaCompra').value,
        monto: document.getElementById('montoCompra').value,
        cuotas: document.getElementById('cuotasCompra').value,
      }),
    });
    mostrarEstado(estadoBancario, `Compra aprobada. Cuota mensual: ${formatearDinero(payload.resultado.cuotaMensual)} · Deuda: ${formatearDinero(payload.resultado.deuda)}`, 'exito');
    formCompraTarjeta.reset();
    await cargarCuentas();
  } catch (error) {
    mostrarEstado(estadoBancario, error.message, 'error');
  }
}

async function pagarTarjetaDesdeFormulario(evento) {
  evento.preventDefault();
  try {
    const payload = await llamarApi('/tarjetas/pago', {
      method: 'POST',
      body: JSON.stringify({
        numeroTarjeta: document.getElementById('tarjetaPago').value,
        numeroCuentaOrigen: document.getElementById('cuentaPago').value,
        monto: document.getElementById('montoPago').value,
      }),
    });
    mostrarEstado(estadoBancario, `Pago realizado. Deuda pendiente: ${formatearDinero(payload.resultado.deuda)}`, 'exito');
    formPagoTarjeta.reset();
    await cargarCuentas();
  } catch (error) {
    mostrarEstado(estadoBancario, error.message, 'error');
  }
}

async function consultarMovimientos() {
  const numeroCuenta = document.getElementById('cuentaMovimientos').value;
  if (!numeroCuenta) {
    listaMovimientos.textContent = 'No tienes productos para consultar.';
    return;
  }
  try {
    const payload = await llamarApi(`/movimientos/${encodeURIComponent(numeroCuenta)}`);
    listaMovimientos.replaceChildren();
    if (!payload.movimientos.length) {
      listaMovimientos.textContent = 'Esta cuenta todavía no tiene movimientos.';
      return;
    }
    for (const movimiento of payload.movimientos) {
      const fila = document.createElement('li');
      fila.textContent = `${new Date(movimiento.fecha).toLocaleString('es-CO')} · ${movimiento.tipo} · ${formatearDinero(movimiento.valor)}`;
      listaMovimientos.append(fila);
    }
  } catch (error) {
    mostrarEstado(estadoBancario, error.message, 'error');
  }
}

formRegistro.addEventListener('submit', registrarDesdeFormulario);
formLogin.addEventListener('submit', iniciarSesionDesdeFormulario);
btnLogout.addEventListener('click', cerrarSesion);
formProducto.addEventListener('submit', abrirProductoDesdeFormulario);
formOperacion.addEventListener('submit', operarDesdeFormulario);
formTransferencia.addEventListener('submit', transferirDesdeFormulario);
formCompraTarjeta.addEventListener('submit', comprarConTarjetaDesdeFormulario);
formPagoTarjeta.addEventListener('submit', pagarTarjetaDesdeFormulario);
document.getElementById('btnActualizarCuentas').addEventListener('click', cargarCuentas);
document.getElementById('btnMovimientos').addEventListener('click', consultarMovimientos);
btnActualizarClientes.addEventListener('click', cargarClientes);
