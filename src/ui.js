const API_URL = '/api';
const STORAGE_KEY = 'miPlataToken';

const formRegistro = document.getElementById('formRegistro');
const formLogin = document.getElementById('formLogin');
const formProducto = document.getElementById('formProducto');
const formOperacion = document.getElementById('formOperacion');
const formTransferencia = document.getElementById('formTransferencia');
const formCompraTarjeta = document.getElementById('formCompraTarjeta');
const formPagoTarjeta = document.getElementById('formPagoTarjeta');
const panelAcceso = document.getElementById('panelAcceso');
const panelBancario = document.getElementById('panelBancario');
const panelClientes = document.getElementById('panelClientes');
const listaClientes = document.getElementById('listaClientes');
const listaCuentas = document.getElementById('listaCuentas');
const listaMovimientos = document.getElementById('listaMovimientos');

let tokenActual = null;
let sesionActual = null;

export function mostrarMensaje(id, texto, tipo = 'info') {
  const elemento = document.getElementById(id);
  if (!elemento) throw new Error(`No se encontró el elemento de mensaje "${id}".`);
  elemento.textContent = texto;
  elemento.className = `message ${tipo}`;
}

async function llamarApi(ruta, opciones = {}) {
  const headers = { 'Content-Type': 'application/json', ...opciones.headers };
  if (tokenActual) headers.Authorization = `Bearer ${tokenActual}`;

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, { ...opciones, headers });
  } catch {
    throw new Error('No se pudo conectar con la API. Inicia el servidor con npm start y vuelve a intentarlo.');
  }

  const payload = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const error = new Error(payload.message || 'La API devolvió un error.');
    error.status = respuesta.status;
    throw error;
  }
  return payload;
}

function formatearDinero(valor) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 2,
  }).format(valor);
}

function esTarjeta(cuenta) {
  return cuenta.tipo === 'TarjetaCredito';
}

function llenarSelector(selector, cuentas, filtro = () => true, etiqueta = cuenta => `${cuenta.numeroCuenta} — ${cuenta.tipo}`) {
  selector.replaceChildren();
  const disponibles = cuentas.filter(filtro);
  if (!disponibles.length) {
    const opcion = document.createElement('option');
    opcion.value = '';
    opcion.textContent = 'No hay productos disponibles';
    selector.append(opcion);
  }
  for (const cuenta of disponibles) {
    const opcion = document.createElement('option');
    opcion.value = cuenta.numeroCuenta;
    opcion.textContent = etiqueta(cuenta);
    selector.append(opcion);
  }
  selector.disabled = disponibles.length === 0;
  return disponibles.length;
}

function actualizarPerfil(sesion) {
  const nombre = sesion.nombreCompleto || sesion.usuario;
  const inicial = nombre.trim().charAt(0).toLocaleUpperCase('es-CO') || 'M';
  document.getElementById('saludoUsuario').textContent = `Hola, ${nombre}`;
  document.getElementById('rolUsuario').textContent = `Este es el resumen de tu espacio financiero · Perfil ${sesion.rol}.`;
  document.getElementById('topbarUsuario').textContent = sesion.usuario;
  document.getElementById('avatarUsuario').textContent = inicial;
  document.getElementById('avatarPerfil').textContent = inicial;
  document.getElementById('perfilNombre').textContent = sesion.nombreCompleto || '—';
  document.getElementById('perfilUsuario').textContent = sesion.usuario || '—';
  document.getElementById('perfilCedula').textContent = sesion.cedula || '—';
  document.getElementById('perfilCelular').textContent = sesion.celular || '—';
  document.getElementById('perfilRol').textContent = sesion.rol || '—';
}

function ocultarLanding(ocultar) {
  document.querySelector('.site-header').hidden = ocultar;
  document.getElementById('inicio').hidden = ocultar;
  document.getElementById('nosotros').hidden = ocultar;
  document.querySelector('.access-section').hidden = ocultar;
  document.getElementById('footer').hidden = ocultar;
}

async function mostrarPanelSesion(sesion) {
  sesionActual = sesion;
  panelAcceso.hidden = true;
  ocultarLanding(true);
  panelBancario.hidden = false;
  panelClientes.hidden = sesion.rol !== 'ADMIN';
  actualizarPerfil(sesion);
  await cargarCuentas();
  if (sesion.rol === 'ADMIN') await cargarClientes();
}

function persistirToken(token) {
  try {
    localStorage.setItem(STORAGE_KEY, token);
    return true;
  } catch {
    return false;
  }
}

function dibujarCuentas(cuentas) {
  listaCuentas.replaceChildren();
  const saldoTotal = cuentas
    .filter(cuenta => !esTarjeta(cuenta))
    .reduce((total, cuenta) => total + Number(cuenta.saldo || 0), 0);
  document.getElementById('saldoTotal').textContent = formatearDinero(saldoTotal);

  if (!cuentas.length) {
    const aviso = document.createElement('p');
    aviso.className = 'empty-state';
    aviso.textContent = 'Aún no tienes productos. Abre una cuenta para comenzar.';
    listaCuentas.append(aviso);
  }

  for (const cuenta of cuentas) {
    const tarjeta = document.createElement('article');
    tarjeta.className = 'producto-card';
    const titulo = document.createElement('h3');
    titulo.textContent = cuenta.tipo === 'TarjetaCredito'
      ? 'Tarjeta de crédito'
      : cuenta.tipo === 'CuentaAhorros'
        ? 'Cuenta de ahorros'
        : 'Cuenta corriente';
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
    mostrarMensaje('estadoBancario', error.message, 'error');
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
    mostrarMensaje('estadoClientes', `${payload.clientes.length} usuario(s) registrado(s).`, 'exito');
  } catch (error) {
    mostrarMensaje('estadoClientes', `No se pudo cargar la lista: ${error.message}`, 'error');
  }
}

async function eliminarCliente(cedula, usuario) {
  if (!confirm(`¿Deseas eliminar el usuario "${usuario}" y sus productos? Esta acción no se puede deshacer.`)) return;
  try {
    await llamarApi(`/clientes/${encodeURIComponent(cedula)}`, { method: 'DELETE' });
    await cargarClientes();
  } catch (error) {
    mostrarMensaje('estadoClientes', error.message, 'error');
  }
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

  if (datos.password !== datos.confirmarPassword) {
    mostrarMensaje('estadoRegistro', 'Las contraseñas no coinciden.', 'error');
    return;
  }

  let cliente;
  try {
    const payload = await llamarApi('/registro', { method: 'POST', body: JSON.stringify(datos) });
    cliente = payload.cliente;
  } catch (error) {
    mostrarMensaje('estadoRegistro', error.message, 'error');
    return;
  }

  try {
    const ingreso = await llamarApi('/login', {
      method: 'POST',
      body: JSON.stringify({ usuario: datos.usuario, password: datos.password }),
    });
    tokenActual = ingreso.token;
    const sesionPersistida = persistirToken(tokenActual);
    formRegistro.reset();
    await mostrarPanelSesion(ingreso.sesion);
    mostrarMensaje(
      'estadoBancario',
      sesionPersistida
        ? `¡Bienvenido a Mi Plata, ${cliente.usuario}! Tu cuenta está lista.`
        : `¡Bienvenido a Mi Plata, ${cliente.usuario}! El navegador no permite recordar esta sesión.`,
      sesionPersistida ? 'exito' : 'warning'
    );
    panelBancario.scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    formRegistro.reset();
    mostrarMensaje('estadoRegistro', `Cuenta creada correctamente. Inicia sesión para continuar. ${error.message}`, 'warning');
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
    const sesionPersistida = persistirToken(tokenActual);
    await mostrarPanelSesion(payload.sesion);
    formLogin.reset();
    mostrarMensaje(
      'estadoBancario',
      sesionPersistida
        ? 'Sesión iniciada correctamente.'
        : 'Sesión iniciada, pero el navegador no permite recordarla para la próxima visita.',
      sesionPersistida ? 'exito' : 'warning'
    );
    panelBancario.scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    tokenActual = null;
    mostrarMensaje('estadoLogin', error.message, 'error');
  }
}

async function cerrarSesion() {
  if (!tokenActual) {
    mostrarMensaje('estadoLogin', 'No hay una sesión activa.', 'error');
    return;
  }

  try {
    await llamarApi('/logout', {
      method: 'POST',
      body: JSON.stringify({ token: tokenActual }),
    });
    localStorage.removeItem(STORAGE_KEY);
    tokenActual = null;
    sesionActual = null;
    panelBancario.hidden = true;
    panelClientes.hidden = true;
    listaClientes.replaceChildren();
    listaCuentas.replaceChildren();
    listaMovimientos.replaceChildren();
    panelAcceso.hidden = false;
    ocultarLanding(false);
    mostrarMensaje('estadoLogin', 'Sesión cerrada correctamente.', 'exito');
    document.getElementById('inicio').scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    mostrarMensaje('estadoBancario', error.message, 'error');
  }
}

async function abrirProductoDesdeFormulario(evento) {
  evento.preventDefault();
  try {
    const payload = await llamarApi('/cuentas', {
      method: 'POST',
      body: JSON.stringify({ tipo: document.getElementById('tipoProducto').value }),
    });
    mostrarMensaje('estadoBancario', `Producto creado: ${payload.cuenta.numeroCuenta}`, 'exito');
    formProducto.reset();
    await cargarCuentas();
  } catch (error) {
    mostrarMensaje('estadoBancario', error.message, 'error');
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
    mostrarMensaje('estadoBancario', `Operación exitosa. Nuevo saldo: ${formatearDinero(payload.resultado.saldo)}`, 'exito');
    formOperacion.reset();
    await cargarCuentas();
  } catch (error) {
    mostrarMensaje('estadoBancario', error.message, 'error');
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
    mostrarMensaje('estadoBancario', `Transferencia realizada por ${formatearDinero(payload.resultado.monto)}.`, 'exito');
    formTransferencia.reset();
    await cargarCuentas();
  } catch (error) {
    mostrarMensaje('estadoBancario', error.message, 'error');
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
    mostrarMensaje('estadoBancario', `Compra aprobada. Cuota mensual: ${formatearDinero(payload.resultado.cuotaMensual)} · Deuda: ${formatearDinero(payload.resultado.deuda)}`, 'exito');
    formCompraTarjeta.reset();
    await cargarCuentas();
  } catch (error) {
    mostrarMensaje('estadoBancario', error.message, 'error');
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
    mostrarMensaje('estadoBancario', `Pago realizado. Deuda pendiente: ${formatearDinero(payload.resultado.deuda)}`, 'exito');
    formPagoTarjeta.reset();
    await cargarCuentas();
  } catch (error) {
    mostrarMensaje('estadoBancario', error.message, 'error');
  }
}

async function consultarMovimientos() {
  const numeroCuenta = document.getElementById('cuentaMovimientos').value;
  if (!numeroCuenta) {
    listaMovimientos.innerHTML = '<li class="empty-state">No tienes productos para consultar.</li>';
    return;
  }
  try {
    const payload = await llamarApi(`/movimientos/${encodeURIComponent(numeroCuenta)}`);
    listaMovimientos.replaceChildren();
    if (!payload.movimientos.length) {
      const aviso = document.createElement('li');
      aviso.className = 'empty-state';
      aviso.textContent = 'Esta cuenta todavía no tiene movimientos.';
      listaMovimientos.append(aviso);
      return;
    }
    for (const movimiento of payload.movimientos) {
      const fila = document.createElement('li');
      fila.textContent = `${new Date(movimiento.fecha).toLocaleString('es-CO')} · ${movimiento.tipo} · ${formatearDinero(movimiento.valor)}`;
      listaMovimientos.append(fila);
    }
  } catch (error) {
    mostrarMensaje('estadoBancario', error.message, 'error');
  }
}

async function restaurarSesion() {
  let tokenGuardado;
  try {
    tokenGuardado = localStorage.getItem(STORAGE_KEY);
  } catch {
    mostrarMensaje('estadoLogin', 'El navegador no permite recuperar la sesión guardada. Inicia sesión para continuar.', 'warning');
    return;
  }
  if (!tokenGuardado) return;

  tokenActual = tokenGuardado;
  try {
    const payload = await llamarApi('/sesion');
    await mostrarPanelSesion(payload.sesion);
  } catch (error) {
    if (error.status === 401) {
      tokenActual = null;
      localStorage.removeItem(STORAGE_KEY);
      mostrarMensaje('estadoLogin', 'Tu sesión venció. Inicia sesión de nuevo.', 'warning');
      return;
    }
    mostrarMensaje('estadoLogin', error.message, 'error');
  }
}

formRegistro.addEventListener('submit', registrarDesdeFormulario);
formLogin.addEventListener('submit', iniciarSesionDesdeFormulario);
document.getElementById('btnLogout').addEventListener('click', cerrarSesion);
formProducto.addEventListener('submit', abrirProductoDesdeFormulario);
formOperacion.addEventListener('submit', operarDesdeFormulario);
formTransferencia.addEventListener('submit', transferirDesdeFormulario);
formCompraTarjeta.addEventListener('submit', comprarConTarjetaDesdeFormulario);
formPagoTarjeta.addEventListener('submit', pagarTarjetaDesdeFormulario);
document.getElementById('btnActualizarCuentas').addEventListener('click', cargarCuentas);
document.getElementById('btnMovimientos').addEventListener('click', consultarMovimientos);
document.getElementById('btnActualizarClientes').addEventListener('click', cargarClientes);
document.getElementById('currentYear').textContent = new Date().getFullYear();

restaurarSesion();
