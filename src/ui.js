import {
  abrirProducto,
  cerrarSesion as cerrarSesionLocal,
  hacerTransferencia,
  iniciarSesion,
  listarMovimientos,
  listarProductos,
  operarCuenta,
  pagarTarjeta,
  comprarConTarjeta,
  registrar,
  restaurarSesion as obtenerSesionGuardada,
} from './localBank.js';

const formRegistro = document.getElementById('formRegistro');
const formLogin = document.getElementById('formLogin');
const formProducto = document.getElementById('formProducto');
const formOperacion = document.getElementById('formOperacion');
const formTransferencia = document.getElementById('formTransferencia');
const formCompraTarjeta = document.getElementById('formCompraTarjeta');
const formPagoTarjeta = document.getElementById('formPagoTarjeta');
const panelAcceso = document.getElementById('panelAcceso');
const panelBancario = document.getElementById('panelBancario');
const listaCuentas = document.getElementById('listaCuentas');
const listaMovimientos = document.getElementById('listaMovimientos');

let sesionActual = null;
let cuentasActuales = [];

export function mostrarMensaje(id, texto, tipo = 'info') {
  const elemento = document.getElementById(id);
  if (!elemento) return;
  elemento.textContent = texto;
  elemento.className = `message ${tipo}`;
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
  document.getElementById('rolUsuario').textContent = 'Este es el resumen de tu espacio financiero · Perfil local.';
  document.getElementById('topbarUsuario').textContent = sesion.usuario;
  document.getElementById('avatarUsuario').textContent = inicial;
  document.getElementById('avatarPerfil').textContent = inicial;
  document.getElementById('perfilNombre').textContent = sesion.nombreCompleto || '—';
  document.getElementById('perfilUsuario').textContent = sesion.usuario || '—';
  document.getElementById('perfilCedula').textContent = sesion.cedula || '—';
  document.getElementById('perfilCelular').textContent = sesion.celular || '—';
  document.getElementById('perfilRol').textContent = sesion.rol || 'CLIENTE';
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
  document.getElementById('panelClientes').hidden = true;
  actualizarPerfil(sesion);
  await cargarCuentas();
}

function dibujarCuentas(cuentas) {
  cuentasActuales = cuentas;
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
  llenarSelector(document.getElementById('cuentaMovimientos'), cuentas);
}

async function cargarCuentas() {
  try {
    if (!sesionActual) return;
    dibujarCuentas(listarProductos(sesionActual.cedula));
  } catch (error) {
    mostrarMensaje('estadoBancario', error.message, 'error');
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
  try {
    await registrar(datos);
    const sesion = await iniciarSesion(datos.usuario, datos.password);
    formRegistro.reset();
    await mostrarPanelSesion(sesion);
    mostrarMensaje('estadoBancario', `¡Bienvenido a Mi Plata, ${sesion.usuario}! Tus datos se guardan en este navegador.`, 'exito');
    panelBancario.scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    mostrarMensaje('estadoRegistro', error.message, 'error');
  }
}

async function iniciarSesionDesdeFormulario(evento) {
  evento.preventDefault();
  const usuario = document.getElementById('usuarioLogin').value.trim();
  const password = document.getElementById('passwordLogin').value;
  try {
    const sesion = await iniciarSesion(usuario, password);
    await mostrarPanelSesion(sesion);
    formLogin.reset();
    mostrarMensaje('estadoBancario', 'Sesión iniciada. Los datos de esta aplicación se almacenan localmente en el navegador.', 'exito');
    panelBancario.scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    mostrarMensaje('estadoLogin', error.message, 'error');
  }
}

function cerrarSesion() {
  cerrarSesionLocal();
  sesionActual = null;
  cuentasActuales = [];
  panelBancario.hidden = true;
  document.getElementById('panelClientes').hidden = true;
  listaCuentas.replaceChildren();
  listaMovimientos.replaceChildren();
  panelAcceso.hidden = false;
  ocultarLanding(false);
  mostrarMensaje('estadoLogin', 'Sesión cerrada correctamente. Tus productos e historial permanecen guardados en este navegador.', 'exito');
  document.getElementById('inicio').scrollIntoView({ behavior: 'smooth' });
}

async function abrirProductoDesdeFormulario(evento) {
  evento.preventDefault();
  try {
    const cuenta = abrirProducto(sesionActual.cedula, document.getElementById('tipoProducto').value);
    mostrarMensaje('estadoBancario', `Producto creado: ${cuenta.numeroCuenta}`, 'exito');
    formProducto.reset();
    await cargarCuentas();
  } catch (error) {
    mostrarMensaje('estadoBancario', error.message, 'error');
  }
}

async function operarDesdeFormulario(evento) {
  evento.preventDefault();
  try {
    const resultado = operarCuenta(
      sesionActual.cedula,
      document.getElementById('accionOperacion').value,
      document.getElementById('cuentaOperacion').value,
      document.getElementById('montoOperacion').value
    );
    mostrarMensaje('estadoBancario', `Operación exitosa. Nuevo saldo: ${formatearDinero(resultado.saldo)}`, 'exito');
    formOperacion.reset();
    await cargarCuentas();
  } catch (error) {
    mostrarMensaje('estadoBancario', error.message, 'error');
  }
}

async function transferirDesdeFormulario(evento) {
  evento.preventDefault();
  try {
    const resultado = hacerTransferencia(
      sesionActual.cedula,
      document.getElementById('cuentaOrigen').value,
      document.getElementById('cuentaDestino').value.trim(),
      document.getElementById('montoTransferencia').value
    );
    mostrarMensaje('estadoBancario', `Transferencia realizada por ${formatearDinero(resultado.monto)}.`, 'exito');
    formTransferencia.reset();
    await cargarCuentas();
  } catch (error) {
    mostrarMensaje('estadoBancario', error.message, 'error');
  }
}

async function comprarConTarjetaDesdeFormulario(evento) {
  evento.preventDefault();
  try {
    const resultado = comprarConTarjeta(
      sesionActual.cedula,
      document.getElementById('tarjetaCompra').value,
      document.getElementById('montoCompra').value,
      document.getElementById('cuotasCompra').value
    );
    mostrarMensaje('estadoBancario', `Compra aprobada. Cuota mensual: ${formatearDinero(resultado.cuotaMensual)} · Deuda: ${formatearDinero(resultado.deuda)}`, 'exito');
    formCompraTarjeta.reset();
    await cargarCuentas();
  } catch (error) {
    mostrarMensaje('estadoBancario', error.message, 'error');
  }
}

async function pagarTarjetaDesdeFormulario(evento) {
  evento.preventDefault();
  try {
    const resultado = pagarTarjeta(
      sesionActual.cedula,
      document.getElementById('tarjetaPago').value,
      document.getElementById('cuentaPago').value,
      document.getElementById('montoPago').value
    );
    mostrarMensaje('estadoBancario', `Pago realizado. Deuda pendiente: ${formatearDinero(resultado.deuda)}`, 'exito');
    formPagoTarjeta.reset();
    await cargarCuentas();
  } catch (error) {
    mostrarMensaje('estadoBancario', error.message, 'error');
  }
}

function consultarMovimientos() {
  const numeroCuenta = document.getElementById('cuentaMovimientos').value;
  if (!numeroCuenta) {
    listaMovimientos.innerHTML = '<li class="empty-state">No tienes productos para consultar.</li>';
    return;
  }
  try {
    const movimientos = listarMovimientos(sesionActual.cedula, numeroCuenta);
    listaMovimientos.replaceChildren();
    if (!movimientos.length) {
      const aviso = document.createElement('li');
      aviso.className = 'empty-state';
      aviso.textContent = 'Esta cuenta todavía no tiene movimientos.';
      listaMovimientos.append(aviso);
      return;
    }
    for (const movimiento of movimientos) {
      const fila = document.createElement('li');
      fila.textContent = `${new Date(movimiento.fecha).toLocaleString('es-CO')} · ${movimiento.tipo} · ${formatearDinero(movimiento.valor)}`;
      listaMovimientos.append(fila);
    }
  } catch (error) {
    mostrarMensaje('estadoBancario', error.message, 'error');
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
document.getElementById('btnActualizarClientes').addEventListener('click', () => mostrarMensaje('estadoClientes', 'La administración de usuarios requiere un servidor y está desactivada en el modo local.', 'warning'));
document.getElementById('currentYear').textContent = new Date().getFullYear();

try {
  const sesion = obtenerSesionGuardada();
  if (sesion) mostrarPanelSesion(sesion);
} catch (error) {
  mostrarMensaje('estadoLogin', error.message, 'warning');
}
