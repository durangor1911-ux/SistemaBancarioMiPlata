import Cliente from './classes/cliente.js';
import {
  guardar,
  listarClientes,
  eliminarCliente,
  buscarPorCedula,
} from './repository/clienteRepository.js';

const cliente1 = Cliente.registrar(
  '1001',
  'Yony F Lopez M',
  '3200000001',
  'yony01',
  'Pass1234',
  'Pass1234',
  'CLIENTE'
);

const cliente2 = Cliente.registrar(
  '1002',
  'Paola Durango',
  '3200000002',
  'paola02',
  'Pass1234',
  'Pass1234',
  'CLIENTE'
);

guardar(cliente1);
guardar(cliente2);

const antes = listarClientes();
if (antes.length < 2) {
  throw new Error('Debe haber al menos 2 clientes registrados');
}

const eliminado = eliminarCliente('1001');
if (!eliminado) {
  throw new Error('No se eliminó al cliente esperado');
}

if (buscarPorCedula('1001') !== null) {
  throw new Error('El cliente eliminado todavía existe en el repositorio');
}

const despues = listarClientes();
if (despues.length !== 1) {
  throw new Error('Tras eliminar un cliente, debe quedar 1 cliente en el repositorio');
}

console.log('Prueba de usuarios OK');
console.log(JSON.stringify(despues, null, 2));
